#include <WiFi.h>
#include <HTTPClient.h>

/* ================= PINS ================= */
#define BUZZER 25
#define RED_LED 26
#define GREEN_LED 27

/* ================= WIFI ================= */
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* serverURL = "https://your-website.com/api/rfid";

/* ================= UID DATA ================= */
String authorizedUIDs[] = {"A3F9221C", "BB112233"};
String blacklistedUIDs[] = {"DEADBEEF"};
String MASTER_UID = "FFFFFFFF";

/* ================= STATES ================= */
bool systemLocked = false;
bool updateLock = false;
bool disturbed = false;

/* ================= BRUTE FORCE ================= */
int unauthorizedCount = 0;
unsigned long firstFailTime = 0;

/* ================= MEDICAL ================= */
struct MedicalProfile {
  String uid;
  String name;
  String condition;
  String emergency;
  bool critical;
};

MedicalProfile medicalDB[] = {
  {"A3F9221C", "Aarav Rana", "Asthma", "Carry inhaler", true},
  {"BB112233", "Shaurya Jain", "None", "No alerts", false}
};

/* ================= ATTENDANCE ================= */
struct Attendance {
  String uid;
  int scans;
  unsigned long lastSeen;
};

Attendance attendanceLog[10];

/* ================= SETUP ================= */
void setup() {
  Serial.begin(9600);

  pinMode(BUZZER, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

/* ================= HELPERS ================= */
bool isInList(String uid, String list[], int size) {
  for (int i = 0; i < size; i++)
    if (uid == list[i]) return true;
  return false;
}

MedicalProfile* getMedical(String uid) {
  for (int i = 0; i < 2; i++)
    if (medicalDB[i].uid == uid) return &medicalDB[i];
  return NULL;
}

void updateAttendance(String uid) {
  for (int i = 0; i < 10; i++) {
    if (attendanceLog[i].uid == uid) {
      attendanceLog[i].scans++;
      attendanceLog[i].lastSeen = millis();
      return;
    }
  }
  for (int i = 0; i < 10; i++) {
    if (attendanceLog[i].uid == "") {
      attendanceLog[i] = {uid, 1, millis()};
      return;
    }
  }
}

/* ================= ALERTS ================= */
void alertLow() {
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(RED_LED, LOW);
}

void alertHigh() {
  digitalWrite(RED_LED, HIGH);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(BUZZER, HIGH);
  delay(400);
  digitalWrite(BUZZER, LOW);
}

void alertCritical() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(BUZZER, HIGH);
    delay(300);
    digitalWrite(RED_LED, LOW);
    digitalWrite(BUZZER, LOW);
    delay(300);
  }
}

/* ================= LOOP ================= */
void loop() {
  if (!Serial.available()) return;

  String uid = Serial.readStringUntil('\n');
  uid.trim();
  unsigned long now = millis();

  /* MASTER CARD */
  if (uid == MASTER_UID) {
    systemLocked = false;
    updateLock = false;
    disturbed = false;
    unauthorizedCount = 0;
    alertLow();
    sendToWebsite(uid, "MASTER", "NONE", "System unlocked", "");
    return;
  }

  /* UPDATE LOCK */
  if (updateLock) {
    alertHigh();
    sendToWebsite(uid, "DENIED", "HIGH", "Update lock active", "");
    return;
  }

  /* SYSTEM LOCK */
  if (systemLocked) {
    alertCritical();
    sendToWebsite(uid, "LOCKED", "CRITICAL", "System locked", "");
    return;
  }

  /* BLACKLIST */
  if (isInList(uid, blacklistedUIDs, 1)) {
    disturbed = true;
    alertCritical();
    sendToWebsite(uid, "DENIED", "HIGH", "Blacklisted UID", "");
    return;
  }

  /* UNAUTHORIZED */
  if (!isInList(uid, authorizedUIDs, 2)) {
    if (unauthorizedCount == 0) firstFailTime = now;
    unauthorizedCount++;

    if (unauthorizedCount >= 5 && (now - firstFailTime) <= 60000) {
      systemLocked = true;
      alertCritical();
      sendToWebsite(uid, "LOCKED", "CRITICAL", "Brute force detected", "");
    } else {
      alertHigh();
      sendToWebsite(uid, "DENIED", "MEDIUM", "Unauthorized UID", "");
    }
    return;
  }

  /* AUTHORIZED */
  unauthorizedCount = 0;
  updateAttendance(uid);

  MedicalProfile* profile = getMedical(uid);
  if (profile && profile->critical) {
    alertCritical();
    sendToWebsite(uid, "AUTHORIZED", "HIGH", "Medical alert", profile->condition + " | " + profile->emergency);
  } else {
    alertLow();
    sendToWebsite(uid, "AUTHORIZED", "LOW", "Access granted", "None");
  }
}

/* ================= SEND DATA ================= */
void sendToWebsite(String uid, String status, String risk, String msg, String medical) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");

  String payload =
    "{"
    "\"uid\":\"" + uid + "\","
    "\"status\":\"" + status + "\","
    "\"risk\":\"" + risk + "\","
    "\"message\":\"" + msg + "\","
    "\"medical\":\"" + medical + "\""
    "}";

  http.POST(payload);
  http.end();
}

