# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Cogmenta's public company website also provides accessible privacy and service terms for users of its connected products and Google OAuth reviewers.

## Capabilities and Constraints

The website is static HTML/CSS/JS, deployed through GitHub Pages. Preserve its existing brand and layout system.

User-confirmed policy scope (September 22, 2026): installed apps keep connected data on-device by default; users can opt into Cogmenta-controlled hosting for personalized AI. Browser users choose hosted processing during account creation through the terms. Personalization currently uses context, retrieval, and memory, not model training. Disabling hosting triggers deletion within 30 days from active storage and 90 days from backups. Future personalized training requires updated disclosures and appropriate consent.

The shared Google OAuth app is currently called Loop; Cogmenta is the recommended replacement name, but console changes are outside this website change. Product names vary. The local connectors library does not own product storage.

## Evidence on Hand

Existing website HTML and assets; local connectors and Loop Personal documentation; organization deployment policy; Google API and Workspace user-data policies; user-confirmed operating model in this task. Existing enterprise deployment agreements have separate scope and may specify shorter deletion deadlines.

## Open Decisions

Hosting regions, infrastructure-provider list, and verification of production deletion and signup behavior remain release work. Do not invent a region, certification, or completed OAuth verification.
