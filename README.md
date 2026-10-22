# CarePoint Hospital Management

A simple local hospital management app built with HTML, CSS, browser JavaScript and Node.js built-ins. It needs no PostgreSQL, `.env` file, or package installation. Records are saved locally in `src/data.json`.

## Run it

Open a terminal in this folder and run:

```powershell
npm start
```

Then open **http://localhost:3002**. The first visit asks you to create an administrator account. There are no demo credentials or sample records. Add your own patients, doctors, beds, appointments, admissions and invoices.

Press **Ctrl+C** in the terminal to stop the server. Starting it again keeps records saved in `src/data.json`.

## Included

- First-run administrator setup and sign-in
- Patient directory and registration
- Doctor directory and registration
- Appointment booking and status updates; prevents double-booking a doctor at the same date and time
- Bed directory, patient admission, discharge and bed cleaning status
- Invoices and manual paid/unpaid tracking
- Dashboard totals start at zero

This is a local learning/demo app, not a production clinical system. Do not store real patient health information in it. It has one local administrator, in-memory sign-in sessions, and JSON file storage; it does not provide the access controls, backup, encryption-at-rest, audit, or compliance features required for real hospital operations. Payment status is a manual record; no money is processed.
