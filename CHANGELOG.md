# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v0.1.3 - yyyy-mm-dd

### Added
* Integrated PrimeReact UI component into the DELTA project (#322).
* Implemented pagination controls for the Hazardous Event List (#296).
* Added RTL styling support (#317).
* Conducted tech assessment for systematic Google Analytics management (#316).

### Changed
* [#370] Upgraded support to Hazard Information Profiles (HIPs) from version 2021 to 2025


### Fixed
- [#368] Corrected tenant file storage path.  
  Tenant-specific folders (e.g., `tenant-1e0eac8f...`) are now properly placed inside the `uploads/` directory (`uploads/tenant-1e0eac8f...`) instead of being created at the application root.  

  **Action (Systems Administrator):**  
  - Move any existing tenant folders from the application root into the `uploads/` directory.  
  - Verify permissions and ownership on the new `uploads/tenant-*` paths to ensure application access.  


* Multiple bug fixes across application modules (#384, #375, #371, #367, #365, #364, #360, #354, #344, #341, #339).

---
