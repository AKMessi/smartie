# Security Policy

## Supported Versions

Security fixes are accepted for the current `main` branch and the latest tagged
release.

## Reporting A Vulnerability

Do not open a public issue for vulnerabilities or privacy leaks. Use GitHub
private vulnerability reporting if it is enabled for the repository. If it is
not enabled, open a minimal public issue asking for a private contact path and
do not include exploit details, recordings, telemetry files, tokens, passwords,
or private screenshots.

Useful reports include:

- platform and desktop session
- Smartie version or commit
- whether native telemetry adapters were enabled
- exact reproduction steps
- whether sensitive data can be exposed in generated project artifacts

## Security Scope

Smartie handles screen, microphone, camera, cursor, click, keyboard intent,
accessibility, and native desktop telemetry. Treat saved project folders as
sensitive because they can reveal UI state and interaction history even when the
rendered video looks harmless.

## Maintainer Expectations

- Do not request private recordings in public.
- Reproduce privacy bugs with synthetic/demo material when possible.
- Prefer local-only diagnostics.
- Patch data leakage before adding new telemetry fields.
- Keep helper protocols explicit and versioned.
