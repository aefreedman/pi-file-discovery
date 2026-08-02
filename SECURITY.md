# Security Policy

## Supported versions

Security fixes are provided for the latest tagged release. Upgrade to the newest release before reporting an issue that may already be fixed.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or credential exposure. Use GitHub private vulnerability reporting:

<https://github.com/aefreedman/pi-file-discovery/security/advisories/new>

Include the affected package version or commit, Pi and Node.js versions, operating system, reproduction steps, expected and observed behavior, impact, and any known mitigation. Do not include real credentials or private repository content.

You should receive an acknowledgement within seven days. Release timing depends on severity, reproducibility, and coordination needs.

## Scope

Relevant reports include package-install behavior, command construction, executable selection, path handling, process lifecycle, and unintended disclosure through tool output. File Discovery is not a sandbox, permission system, or access-control boundary; reports based only on an agent being able to use other Pi tools or shell commands are outside this package's security model. Ordinary bugs and support questions belong in the public issue tracker.
