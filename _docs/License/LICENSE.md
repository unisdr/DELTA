# UNDRR DELTA Resilience – License

## License Status

DELTA Resilience is open source software developed by UNDRR for country-level disaster tracking systems. The project has adopted the **Apache License 2.0** as its open source license.

The full license text is available in the [`LICENSE`](../../LICENSE) file at the repository root. The `package.json` `"license"` field is set to `"Apache-2.0"`.

The Apache License 2.0 was selected for its patent protection, international deployment suitability, and alignment with DPG requirements. See [License-comparison.md](./License-comparison.md) for the detailed analysis and [license-recommendation.md](./license-recommendation.md) for the recommendation rationale.

## License Goals

Whichever license is selected, it must:

- Allow countries to deploy and customize their own DELTA Resilience instances
- Enable contributions from the open-source community
- Ensure legal clarity around third-party dependencies
- Maintain permissive terms while protecting the integrity of the platform

## Third-Party Dependency Overview

The DELTA Resilience platform includes multiple third-party components, each governed by permissive open-source licenses:

| Dependency                             | License                                   |
| -------------------------------------- | ----------------------------------------- |
| React (`react`, `react-dom`)           | MIT                                       |
| Remix (`@remix-run/*`)                 | MIT                                       |
| TypeScript (`typescript`)              | Apache 2.0                                |
| PostgreSQL (`pg`, `postgres`)          | PostgreSQL (MIT-like)                     |
| UNDP Icon Set (`react-icons`)          | MIT                                       |
| JSZip (`jszip`)                        | MIT (dual-licensed with GPLv3, using MIT) |
| Drizzle (`drizzle-orm`, `drizzle-kit`) | Apache 2.0                                |
| XLSX (`xlsx`)                          | Apache 2.0                                |
| Leaflet (`leaflet`)                    | BSD-2-Clause                              |
| OpenLayers (`ol`)                      | BSD-2-Clause                              |
| Dotenv (`dotenv`)                      | BSD-2-Clause                              |
| Other Libraries                        | MIT, Apache 2.0, ISC, BSD-2-Clause        |

**Notes**:

- The "Other Libraries" row covers remaining dependencies with the following distribution (based on `license-report.json`):
  - MIT License: 624 packages (majority)
  - ISC License: 87 packages (e.g., `geojson-vt`, `minimatch`, `split2`)
  - Apache-2.0: 20 packages
  - BSD-3-Clause: 10 packages (e.g., `ieee754`)
  - BSD-2-Clause: 7 packages (e.g., `dotenv`, `leaflet`, `ol`)
  - Other OSI-approved: Unlicense, CC0-1.0 (minimal usage)
    See [license-report.json](./license-report.json) for the complete list.

These licenses are compatible with Apache 2.0. They:

- Allow reuse in commercial or proprietary systems
- Require attribution but no source disclosure (non-copyleft)
- Impose minimal legal restrictions

## Country-Level Deployment Terms

Each country instance may be subject to local terms and conditions. The Apache License 2.0 provides clear guidance for:

- Customization rights
- Redistribution of modified versions
- Contribution pathways back to the main codebase

For legal inquiries, please contact the UNDRR.
