# Implementation Notes

## Replaced

- Removed the client-visible admin password configuration.
- Retired the fixed “Negative / Clean” result form.
- Replaced the nail-only workflow with a unified non-DOT record.
- Replaced collection-only public verification with identity-matched record verification.
- Removed unsupported public claims for DOT certification, specific accreditation, state license number, and blanket HIPAA compliance from the supplied pages.

## Record and print flow

1. Staff signs in.
2. Server reserves permanent identifiers.
3. Staff enters collection and result information.
4. Browser and server validate the record.
5. Server encrypts and atomically stores the record.
6. Print page fetches that saved record by internal ID.
7. Print action records `printedAt` and `printCount` without changing the record revision.

## Production review checklist

- Confirm the company’s legal name, address, phone policy, credentials, and licenses.
- Obtain the receiving laboratory’s approved collection instructions and report terminology.
- Have an MRO define when “verified” language may be used.
- Approve the donor authorization/release and retention schedule.
- Complete a security/privacy review, access-control plan, backup test, breach-response plan, and staff training.
- Replace file storage with a managed database before multi-location or high-volume use.
