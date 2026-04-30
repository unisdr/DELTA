# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v0.2.1 - 2026-04-20

### Added
- Language-scoped routing expansion under /$lang+/... across UI and API routes.
- MCP support, including API implementation, docs, and example prompt/resource content.
- New and expanded management flows for super admin: country accounts, fictitious country management, clone/reset-related flows, and related navigation.
- Organization management capabilities and linked data model updates.
- User profile and TOTP flows/pages (enable, disable, login), plus improved session-handling UX.
- FAQ and related about-page content/routes.
- Broader automated test coverage (assets, disaster records, disruptions, losses, human effects, handlers, and Playwright config updates).
### Changed
- Major UI refresh across auth/settings/admin areas using PrimeReact + Tailwind (login, API keys, access management, settings/system, dialogs, menu structures).
- Service/repository/data-layer refactoring across multiple domains (country accounts, profile, select-instance logic, human effects, and related backend modules).
- Human effects module refactored into smaller model files, with behavior improvements (validation, keyboard save support, cleanup).
- Route/file organization updates and structural cleanup (moved/simplified route modules, removed obsolete components/files, doc structure improvements).
- Dependency and tooling updates (including Vite updates, lint-staged, build/dev script improvements, and production prep for v0.2.1).
### Fixed
- Tenant-isolation and country-account scoping issues in damages/losses/disruptions and related view/edit flows.
- Session and menu separation bugs when using super-admin and user pages in parallel tabs.
- Auth and redirect issues (SSO role routing, authenticated super-admin redirects, select-instance/login redirect edge cases).
- Invitation/email flow defects (resend visibility rules, expired invite handling, invite duration/eligibility behavior, forgot-password email checks).
- Upload and file-size handling issues (attachment size validation/errors, upload path fixes, max file size alignment).
- Multiple UX/layout defects (menu alignment, responsive behavior, dialog/button alignment, icon/text consistency, FAQ/landing page polish).
- Test/build reliability issues (broken tests, Playwright DB init/config, sequential upgrade script fixes, command/documentation correctness).

## v0.2.0 - 2026-02-19

### Added

- Multi-language support for Arabic and Russian

### Changed

- Major upgrade: React Router 7.12 and React from 18 to 19 upgrade
- Refactored data access and database code to data layer
- Reorganized project structure (locales, utilities, schema files)
- Code cleanup: removed unused functions, binary folders, and unnecessary variables

### Fixed

- Security vulnerabilities update and bug fixes
- Custom disaggregation - deletion of first aggregation grouping (#430)

## v0.1.3 - 2025-12-23

### Added

- Integrated PrimeReact UI component into the DELTA project (#322).
- Implemented pagination controls for the Hazardous Event List (#296).
- Added RTL styling support (#317).
- Conducted tech assessment for systematic Google Analytics management (#316).

### Changed

- [#370] Upgraded support to Hazard Information Profiles (HIPs) from version 2021 to 2025
  - Hip type name changed from Geohazards to Geological.
  - List of newly added clusters
    - Ground Failure
    - Other Biological Hazards
    - Space Weather
    - Asphyxiant Gases
    - Specific Infectious Diseases of Public Health Concern
  - List of removed clusters. (we set them as null if used.)
    - Fisheries and Aquaculture
    - Invasive Species
    - Human Animal Interaction
    - CBRNE (Chemical, Biological, Radiological, Nuclear and Explosive)
    - Mental Health
    - Food Safety
    - Infectious Diseases (Aquaculture)
    - Pesticides
    - CBRNE (Chemical, Biological, Radiological, Nuclear and Explosive)
    - Fisheries and Aquaculture
    - Environmental Degradation (Forestry)
    - Pressure Related
    - CBRNE (Chemical, Biological, Radiological, Nuclear and Explosive)
    - Infrastructure Failure
    - Marine
    - Flood
  - List of newly added specific hazards
    - Opioids and Other Psychoactive Substances
    - Gravitational Mass Movement (‘Landslide’)
    - Heavy Metals and Other Trace Elements
    - Toxic Gases
    - Asphyxiant ​​Gases
    - Persistent Organic Pollutants
    - Perfluoroalkyl and Polyfluoroalkyl Substances
    - Corrosive Substances
    - Ammonium Nitr​​ate
    - Debris and earth (mud)flows and rock avalanches
    - Rock, debris and earth (mud) slide
    - Rock, debris and earth topples
    - Rain
    - Flooding
    - Marine Heatwave
    - Space Debris
    - Advanced Persistent Threat
    - Denial of Service
    - Supply Chain Attack
    - Social Engineering - Phishing
    - Tunnel Failure
    - Marburg virus disease
  - List of removed specific hazards. (we set them as null if used.)
    - Invasive Weeds
    - Foodborne Microbial Hazards (including human enteric virus and foodborne parasite)
    - Antimicrobial Resistant Microorganisms
    - Vector-borne diseases (VBD) (Animals)
    - Trypanosomosis (Animal)
    - Phosphine
    - Residue of Pesticides
    - Insecticides
    - Fungicides
    - Hazardous Pesticide Contamination in Soils
    - Oil Pollution
    - Ground Shaking (Earthquake)
    - Liquefaction (Earthquake Trigger)
    - Earthquake Surface Rupture, Fissures, and Tectonic Uplift/Subsidence
    - Subsidence and Uplift, Including Shoreline Change (Earthquake Trigger)
    - Tsunami (Earthquake Trigger)
    - Landslide or Debris Flow (Earthquake Trigger)
    - Ground Gases (Seismogenic)
    - Ballistics (Volcanic)
    - Landslide (Volcanic Trigger)
    - Ground Shaking (Volcanic Earthquake)
    - Tsunami (Volcanic Trigger)
    - Lightning (Volcanic Trigger)
    - Urban Fire (During/Following Volcanic Eruption)
    - Subsidence and Uplift, Including Shoreline Change (Magmatic/Volcanic Trigger)
    - Ground Shaking (induced earthquake, reservoir fill, dams, cavity collapse, underground explosion, impact, hydrocarbon fields, shale exploration, etc.)
    - Aquifer Recharge (Systems Failure/Outages)
    - Sediment Rock Avalanche
    - Tsunami (Submarine Landslide Trigger)
    - Polluted Air
    - Ice Storm
    - Mud Flow
    - Rock slide
    - Subtropical Storm
    - Tropical Storm
    - Radiation Agents
    - Misconfiguration of Software and Hardware
    - Non-Conformity and Interoperability
    - Data Security-Related Hazards
    - Outage
    - Personally Identifiable Information (PII) Breach
    - Internet of Things (IOT)-Related Hazards
    - Disrupt

### Fixed

- [#368] Corrected tenant file storage path.  
  Tenant-specific folders (e.g., `tenant-1e0eac8f...`) are now properly placed inside the `uploads/` directory (`uploads/tenant-1e0eac8f...`) instead of being created at the application root.

  **Action (Systems Administrator):**
  - Move any existing tenant folders from the application root into the `uploads/` directory.
  - Verify permissions and ownership on the new `uploads/tenant-*` paths to ensure application access.

* Multiple bug fixes across application modules (#384, #375, #371, #367, #365, #364, #360, #354, #344, #341, #339).

---
