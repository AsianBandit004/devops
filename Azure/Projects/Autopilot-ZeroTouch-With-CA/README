Project 1 — Intune Autopilot Zero-Touch + Compliance Baseline

Goal: Provision Windows devices with Autopilot, enforce compliance, deploy apps, and verify reporting end-to-end.

Prereqs: Azure tenant with Intune (MEM), a test Windows 11 device (physical or VM), local admin on test device.

Steps

Create device group (dynamic)

Intune admin center → Groups → New group → Security.

Dynamic rule (example for Autopilot devices):

(device.devicePhysicalIDs -any (_ -contains "[ZTDId]"))


Create Autopilot profile

Devices → Windows → Windows enrollment → Deployment Profiles → Create profile.

Mode: User-driven (or Pre-provisioned (white glove)), OOBE: Skip privacy/region/keyboard, Join: Entra ID, Apply device name template: PC-%SERIAL%.

Enrollment Status Page (ESP)

Windows enrollment → Enrollment Status Page → Create.

Block device use until required apps/profiles install: On.

Compliance policy (example)

Devices → Windows → Compliance → Create:

Require BitLocker: On

Require Secure Boot: On

Minimum OS: 10.0.22621.0

Password required: Yes (min length 8)

Configuration profiles

BitLocker: Endpoint security → Disk encryption → Windows 10+ → Require TPM, XTS-AES 256, OS drive only to start.

Windows Update rings: Quality deferrals 0–7 days, Feature deferrals 7–30 days, Active hours 8–18.

Microsoft Defender: Enable real-time, cloud-delivered protection; ASR rules (block Office child processes, etc.).

Apps

Apps → Windows → Add:

Company Portal (Store app).

Microsoft 365 Apps (config: Outlook, Teams, OneDrive).

Proactive remediations (sample)

Reports → Endpoint analytics → Proactive remediations → Create:

Detection (PowerShell) — check BitLocker:

$status = (Get-BitLockerVolume -MountPoint "C:").ProtectionStatus
if ($status -ne 1) { exit 1 } else { exit 0 }


Remediation — enable BitLocker if off:

Enable-BitLocker -MountPoint "C:" -EncryptionMethod XtsAes256 -UsedSpaceOnly


Test

On the device: Get-WindowsAutopilotInfo -Online (or capture hash & import).

Reset device → run through OOBE → verify profile, compliance, apps, and device shows Compliant in Intune.
