# S.H.I.E.L.D.
### Self-Healing IoT for Early Localization and Detection of Underground Cable Faults

[![Spring Boot 3.3.4](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Java 17](https://img.shields.io/badge/Java-17%20LTS-blue.svg)](https://adoptium.net)
[![React 19](https://img.shields.io/badge/React-19.3-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS-4.x-38bdf8.svg)](https://tailwindcss.com)
[![License: Academic](https://img.shields.io/badge/License-Academic%20Prototype-orange.svg)]()

S.H.I.E.L.D. is a complete, production-grade engineering software implementation of an underground power cable fault detection, localization, isolation, and self-healing system.

---

## ⚡ Core Operational Sequence

The system models a radial $11\text{ kV}$ underground power distribution cable and executes the autonomous sequence:

$$\text{DETECT} \longrightarrow \text{LOCALIZE} \longrightarrow \text{ISOLATE} \longrightarrow \text{REROUTE} \longrightarrow \text{ALERT}$$

1. **DETECT**: Real-time periodic sampling ($1\text{ Hz}$) observes sending-end voltages and currents along cable segments ($S_1 - S_4$). Consecutive anomalous readings trigger fault confirmation.
2. **LOCALIZE**: Computes estimated fault distance using the report-based Voltage Ratio method:
   $$D_f = \left(\frac{V_f}{V_T}\right) \times L_T$$
   Displays ground-truth comparison and absolute localization error $|D_{\text{est}} - D_{\text{actual}}|$.
3. **ISOLATE**: Automatically trips the designated relay ($R_1 - R_4$) corresponding to the affected cable segment to quarantine the short-circuit, ground leakage, or open-circuit failure.
4. **REROUTE**: Validates whether the alternate backup feeder is online and downstream load demand ($1.5\text{ MW}$) is within feeder capacity ($200\text{ A}$). Closes tie-breaker relay $R_B$ to restore power to downstream consumers.
5. **ALERT**: Issues localized in-application maintenance notifications with severity levels (`INFO`, `WARNING`, `CRITICAL`), logs immutable audit trail events, and exports history to CSV.

---

## 🚀 Quick Start (How to Run)

### Option A: One-Click Launch (Windows)
Double-click `run.bat` in the project root. This starts both the Spring Boot backend and the Vite React frontend in their own terminal windows and opens `http://localhost:5173` in your browser.

---

### Option B: Manual Command-Line Startup

#### 1. Start the Backend (Port 8080)
Open a terminal in the project directory:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
* Backend starts on `http://localhost:8080`
* H2 Database file initialized at `./backend/data/shielddb`
* Default network seeded with 4 segments ($2.5\text{ km}$ each, $10\text{ km}$ total), 4 isolation relays, 1 backup feeder, and 2 downstream distribution loads.

#### 2. Start the Frontend (Port 5173)
Open a second terminal:
```powershell
cd frontend
npm run dev
```
* Open your browser at `http://localhost:5173`

---

## 🧪 Automated Acceptance Testing

Run the full integration test suite:
```powershell
cd backend
.\mvnw.cmd test
```

The test suite validates:
* **Scenario 1**: Normal operating state with balanced voltages and positive currents.
* **Scenario 2**: Open-circuit interruption ($I \to 0\text{ A}$).
* **Scenario 3**: Short-circuit overcurrent ($R_{\text{arc}} \approx 0.01\ \Omega$).
* **Scenario 4**: Ground-fault leakage ($R_{\text{g}} = 10\ \Omega$) with voltage attenuation.
* **Scenario 5 & 6**: Relay trip state transitions and interlocks.
* **Scenario 7**: Voltage ratio localization accuracy and boundary validation ($V_T > 0$, $L_T > 0$).
* **Scenario 8**: Safety checks preventing re-closure on confirmed faulted segments.
* **Scenario 9 & 10**: Persistent H2 storage across sessions and REST API end-to-end cycle.
* **Scenario 11 & 12**: System reset to normal and error handling with RFC-7807 error responses.

---

## 📊 Application Modules

* **Module A — Interactive Cable Network**: SVG schematic with animated power flow, live kV/A overlays, and interactive segment inspection.
* **Module B — Fault Injection & Detection**: Modal allowing injection of Open-Circuit, Short-Circuit, or Ground Fault on any segment with custom distance sliders.
* **Module C — Fault Localization Analysis**: Dedicated formula laboratory comparing report-based voltage ratio against physical cable impedance realities.
* **Module D & E — Protection Relays & Backup Feeder**: Manual test bench to trip/close relays and test backup feeder failure/outage scenarios.
* **Module F — Real-Time Telemetry & Audit Log**: Recharts graphs of voltages, currents, and power, paired with a live timestamped event log.
* **Module G — Maintenance Notification Center**: In-app notifications with severity indicators and read/unread filtering.
* **Module H — Historical Records**: Multi-parameter filtering by segment and fault type, individual post-mortem fault inspection, and CSV export.

---

## 🔌 ESP32 Hardware Integration Ready

The backend provides a clean REST and SSE interface ready to bridge to physical ESP32 microcontrollers:
* `POST /api/simulation/faults`: Can receive trigger commands from physical tactile buttons or ADC sensor thresholds.
* `POST /api/relays/{id}/open` & `POST /api/relays/{id}/close`: Send GPIO signals to physical optocoupled relay modules.
* `GET /api/events/stream`: Server-Sent Events stream for IoT monitoring dashboards.
