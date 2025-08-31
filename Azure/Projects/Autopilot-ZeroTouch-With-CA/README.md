
---

# Project 1 — Intune Autopilot Zero-Touch + Compliance Baseline

**Goal:** Provision Windows devices with Autopilot, enforce compliance, deploy apps, and verify reporting end-to-end.
**Prereqs:**

* Azure tenant with Intune (Microsoft Endpoint Manager)
* A test Windows 11 device (physical or VM)
* Local admin rights on the test device

---

## Steps

### Device group (dynamic)

Intune admin center → **Groups → New group → Security**

Dynamic rule (example for Autopilot devices):

```kusto
(device.devicePhysicalIDs -any (_ -contains "[ZTDId]"))
```

---

### Autopilot profile

**Devices → Windows → Windows enrollment → Deployment Profiles → Create profile**

* Mode: *User-driven* (or Pre-provisioned “white glove”)
* OOBE: Skip privacy/region/keyboard
* Join: Entra ID
* Apply device name template: `PC-%SERIAL%`

---

### Enrollment Status Page (ESP)

**Windows enrollment → Enrollment Status Page → Create**

* Block device use until required apps/profiles install: **On**

---

### Compliance policy (example)

**Devices → Windows → Compliance → Create policy**

* Require BitLocker: On
* Require Secure Boot: On
* Minimum OS: `10.0.22621.0`
* Password required: Yes (min length 8)

---

### Configuration profiles

* **BitLocker**: Endpoint security → Disk encryption → Windows 10+

  * Require TPM, XTS-AES 256, OS drive only to start
* **Windows Update rings**:

  * Quality deferrals: 0–7 days
  * Feature deferrals: 7–30 days
  * Active hours: 8–18
* **Microsoft Defender**:

  * Enable real-time and cloud-delivered protection
  * Enable ASR rules (e.g., block Office child processes)

---

### Apps

**Apps → Windows → Add**

* Company Portal (Store app)
* Microsoft 365 Apps (Outlook, Teams, OneDrive configured)

---

### Proactive remediations (sample)

**Reports → Endpoint analytics → Proactive remediations → Create**

**Detection script (PowerShell)** — check BitLocker:

```powershell
$status = (Get-BitLockerVolume -MountPoint "C:").ProtectionStatus
if ($status -ne 1) { exit 1 } else { exit 0 }
```

**Remediation script** — enable BitLocker if off:

```powershell
Enable-BitLocker -MountPoint "C:" -EncryptionMethod XtsAes256 -UsedSpaceOnly
```

---

### Test

On the device:

1. Run:

   ```powershell
   Get-WindowsAutopilotInfo -Online
   ```

   (or capture hash & import).
2. Reset device → run through OOBE.
3. Verify Autopilot profile applied, compliance enforced, apps installed.
4. Confirm device shows **Compliant** in Intune portal.

---

## Cleanup

* Remove test device from Autopilot / Intune after validation.
* Delete dynamic device group if no longer needed.

---

## Cost notes

* Intune included in Microsoft 365 E3/E5, Business Premium, or standalone license.
* No additional Azure infra costs.

---

✅ Done!

---

