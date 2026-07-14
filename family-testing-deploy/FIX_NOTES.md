# Release 2 Fix Notes

- Replaced duplicated/broken-encoding document text.
- Added hair, nail, urine, and oral-fluid specimen-specific fields.
- Removed the fixed always-negative result workflow.
- Added controlled pending, preliminary negative, presumptive positive, final negative, confirmed positive, invalid, cancelled, rejected, and refusal statuses.
- Added laboratory, accession, confirmation, reviewer, MRO, consent, transfer, tracking, and analyte fields.
- Added server-side validation that prevents an onsite screen from being saved as a final positive or final negative.
- Added permanent reference, verification, specimen, and record IDs.
- Added encrypted atomic record storage, server-managed login sessions, sign-in throttling, and no-store/security headers.
- Added saved-record printing and print audit fields.
- Added public verification requiring key + donor last name + date of birth.
- Added a paid Render persistent-disk configuration.
- Added an end-to-end automated hair-test workflow test.

Read `README.md` and `IMPLEMENTATION_NOTES.md` before deployment.
