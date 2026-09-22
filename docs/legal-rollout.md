# Privacy and terms rollout

The September 22, 2026 pages implement the owner-approved policy: local by default in installed apps; hosted processing chosen at browser signup or through a separate installed-app opt-in; Cogmenta-controlled AI infrastructure; context, retrieval, and memory today; no current training on connected data; active hosted deletion within 30 days and backup expiry within 90 days of the same request.

## Website

- `/privacy/` and `/terms/` are public static pages, linked from both language homepages. The policies are in English, explicitly indicated on the Korean homepage.
- GitHub Pages packaging includes both pages, their stylesheet, and the Korean homepage.
- The effective date is September 22, 2026. Adjust it if publication is delayed.
- Publishing these pages does not implement signup, consent, retention, or deletion in consuming apps, and does not change Google Cloud configuration.

Privacy, security, deletion, and terms inquiries use `support@cogmenta.biz`.

## Product integration

Display this immediately beside an unchecked required agreement checkbox at browser signup, with working links:

> I agree to Cogmenta's Terms of Service and acknowledge its Privacy Policy. I understand that this browser service stores and processes information I provide and data from accounts I choose to connect on Cogmenta-controlled servers to deliver personalized AI features.

Record the terms/privacy version, timestamp, account, and affirmative action. Google authorization is a separate step. Do not preselect Google connections. Installed-app hosting needs its own opt-in identifying transferred data and derived content. Future training needs its own disclosure and required consent; today's agreement does not authorize it.

Verify before relying on the published commitments:

- Disabling hosting stops new uploads, collection into hosted storage, and AI jobs for affected data. Support requests trigger the same process. Browser users can request deletion without continuing to use hosted AI.
- Deletion covers source content, credentials, indexes, embeddings, memories, queued work, and any content-bearing logs. Active deletion finishes within 30 days; backup expiry within 90 days, measured from the same request. Restores reapply deletion before normal use.
- Local-copy removal and Google authorization revocation are separate controls. Avoid promising revocation alone erases retrieved data.
- Validate actual storage protections, hosting regions, infrastructure-provider disclosures, and any legally required retention against the deployed service. No certification, region, or specific hosting provider is asserted by these pages.
- Reconcile separate enterprise deployment commitments, including their 24-hour deletion promise, within their own scope. The generic pages do not override shorter commitments.

## Google configuration

- The known OAuth display name is Loop. Cogmenta is the recommended replacement; no console change has been made. Privacy copy recognizes the existing Loop name. After renaming, align the consent screen, product notices, verification video, and homepage.
- Set the privacy URL to `https://cogmenta.tech/privacy/` and terms URL to `https://cogmenta.tech/terms/` after publication. Verify domain ownership.
- The existing homepage markets enterprise on-premises deployments. For OAuth verification, add an accurate description or dedicated homepage for the specific connected products, including browser/hosted behavior. Do not present “nothing leaves the building” as a promise for hosted products.
- Request only implemented scopes. Gmail/Drive read-only scopes can require restricted-scope verification; a policy page alone does not complete verification.

Sources: [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), [Google Workspace data policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy), [Google verification requirements](https://support.google.com/cloud/answer/13464321?hl=en), connectors/host-integration docs, the organization's deployment policy, and owner-confirmed requirements. The website work does not verify production backend compliance.

## Current connector coverage

The pages cover Slack, GitHub, Notion, Gmail, Drive, and Calendar, verified against the six current connector packages. Slack imports text, GitHub reads activity feeds rather than repository source, and Notion reads shared pages/data sources and top-level text rather than data-source rows or nested blocks. Provider permissions may exceed the reads performed. Keep these descriptions current when capabilities change. General consent, hosting, and deletion provisions cover all connectors; the Google Limited Use statement remains explicitly Google-specific. Both legal pages use `support@cogmenta.biz` throughout.
