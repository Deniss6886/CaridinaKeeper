# CaridinaKeeper Research Record

**Research snapshot:** 2026-09-12  
**Purpose:** Record the evidence behind the product name, positioning, husbandry language, technology choices, GitHub release approach, and accessibility target.

This document separates observations from product judgments:

- **Fact** means the statement is supported by a cited primary source, an official product page, an official registry response, or the repository itself.
- **Conclusion** means a product or engineering judgment derived from those facts.
- **Risk** means an uncertainty that should remain visible until it is resolved by testing, specialist review, or additional evidence.

This is a research record, not legal, veterinary, or animal-health advice. Links and registry results are a point-in-time snapshot and can change.

## Executive findings

1. **Fact:** No exact public product or package collision for `CaridinaKeeper` was found in the checked GitHub, npm, or PyPI indexes. The checked `.com`, `.app`, and `.io` RDAP endpoints returned “not found” at the time of research.
2. **Risk:** Those results do not establish trademark clearance or domain availability. `CaridinaKeeper` is highly descriptive and is close in meaning and sound to the existing ShrimpKeepers product.
3. **Fact:** Logging, reminders, parameter charts, breeding records, remineralization tools, AI assistance, offline use, and even Home Assistant support already exist separately in competing products.
4. **Conclusion:** The defensible position is the combination of public/self-hostable open source, evidence-aware Caridina husbandry, measurement provenance, breeding-line and water-batch traceability, and a safe local Home Assistant bridge.
5. **Fact:** Current peer-reviewed literature explicitly identifies major species-specific ecophysiology gaps for ornamental shrimp.
6. **Conclusion:** That evidence does not justify universal Caridina water-value presets. CaridinaKeeper should treat ranges as editable, sourced starting profiles or keeper-defined targets—not as universal “safe,” “healthy,” or diagnostic thresholds.
7. **Fact:** The repository is structured as an offline-first static PWA using React, TypeScript, Vite, Dexie/IndexedDB, Zod, i18next, Vitest, Playwright, and axe.
8. **Conclusion:** WCAG 2.2 Level AA is the appropriate release target. Automated axe checks are useful but cannot support a conformance claim without manual keyboard, screen-reader, reflow, contrast, and interaction testing.

## 1. Name, domain, and trademark risk

### 1.1 Exact-name checks

| Check                                                                                    | Observed fact on 2026-09-12                    | What it does not prove                                                                                     |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [GitHub repository search](https://github.com/search?q=CaridinaKeeper&type=repositories) | No exact repository-name result was found.     | It does not search all company names, products, unindexed code, or trademarks.                             |
| [npm registry](https://registry.npmjs.org/caridinakeeper)                                | The exact package endpoint returned not found. | The name could be reserved or claimed later.                                                               |
| [PyPI JSON API](https://pypi.org/pypi/caridinakeeper/json)                               | The exact project endpoint returned not found. | The name could be claimed later.                                                                           |
| [.com RDAP](https://rdap.verisign.com/com/v1/domain/CARIDINAKEEPER.COM)                  | The registry endpoint returned not found.      | A registrar can still reject, reserve, premium-price, or sell the domain before registration is completed. |
| [.app RDAP](https://pubapi.registry.google/rdap/domain/CARIDINAKEEPER.APP)               | The registry endpoint returned not found.      | Same limitation.                                                                                           |
| [.io RDAP](https://rdap.identitydigital.services/rdap/domain/CARIDINAKEEPER.IO)          | The registry endpoint returned not found.      | Same limitation.                                                                                           |

**Conclusion:** The exact identifier appears usable for a repository or early open-source project, subject to a fresh check immediately before publication or registration.

### 1.2 Confusion and registrability

**Facts**

- [ShrimpKeepers](https://www.shrimpkeepers.com/) is an active shrimp-focused tank-tracking product. Its name and target audience overlap materially with CaridinaKeeper.
- “Caridina keeper” is also an ordinary descriptive phrase for a person who keeps Caridina shrimp.
- The [German Patent and Trade Mark Office](https://www.dpma.de/marken/markenrecherche/) states that its register does not perform a complete similarity search and that earlier company signs and other rights may also matter.
- The [EUIPO guidance on descriptive marks](https://guidelines.euipo.europa.eu/2319054/1788090/trade-mark-guidelines/chapter-4-descriptive-trade-marks-article%C2%A07-1-c-eutmr-) explains why terms perceived directly as information about purpose, kind, or characteristics may be refused or receive weak protection.
- The [WIPO Global Brand Database](https://www.wipo.int/en/web/global-brand-database) advises searchers to consult national and regional registers as well as the global database.

**Conclusions**

- `CaridinaKeeper` is transparent and understandable, but likely weak as an exclusive commercial mark because it describes both the subject and the user role.
- Capitalization and removing the space do not remove similarity or descriptiveness risk.
- If strong brand protection is important, use a distinctive coined house mark and retain “Caridina tracker” or “shrimp husbandry journal” as the descriptive subtitle.
- If the goal is a community open-source project, accepting a weaker descriptive name may be reasonable, provided the project does not claim exclusivity.

**Required follow-up before a commercial launch**

1. Search exact and similar word, phonetic, and figurative marks in [DPMAregister](https://register.dpma.de/DPMAregister/marke/einsteiger), [TMview](https://www.tmdn.org/tmview/), [EUIPO eSearch](https://euipo.europa.eu/eSearch/), and the [WIPO Global Brand Database](https://www.wipo.int/en/web/global-brand-database).
2. Check relevant software/SaaS and educational classes, company registers, app stores, social handles, and fresh domain status.
3. Obtain professional clearance in intended markets. Do not describe this research as a trademark opinion.

## 2. Competitive landscape

The table records features claimed by the products themselves. It does not independently validate product quality, scientific accuracy, privacy, or availability in every region.

| Product                                                                | Observed product claims                                                                                                                          | Positioning implication                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [ShrimpKeepers](https://www.shrimpkeepers.com/)                        | TDS/GH/KH/pH tracking, species presets, remineralizer calculations, berried-female countdowns, death/colony analysis, and multiple tanks.        | A shrimp-specific parameter log and remineralizer calculator are not unique.                                       |
| [Shrimp Tank](https://shrimptank.app/)                                 | Caridina, Neocaridina, and Sulawesi records; readings, care events, molts, losses, berried females, shrimplets, and breeding lines.              | Shrimp event logging and line tracking are already expected features.                                              |
| [Blissfish](https://blissfish.app/)                                    | Caridina/Neocaridina lineage trees, rule-based cross prediction, inbreeding warnings, equipment integrations, and Home Assistant on its roadmap. | Lineage and a planned smart-home connection do not establish differentiation by themselves.                        |
| [ShrimpID](https://apps.apple.com/us/app/shrimpid/id6753187182)        | Line/rack records, OCR, shrimp counting, and heatmaps.                                                                                           | Imaging and rack workflows already serve advanced breeders.                                                        |
| [AquaNexus](https://aquanexus.app/)                                    | Breeding, source-water, inventory, and sales workflows.                                                                                          | Water source and stock provenance are emerging expectations.                                                       |
| [SpawnOS](https://spawnos.ca/)                                         | Aquarium breeding and spawn-management workflows.                                                                                                | Breeding records are a wider aquaculture category, not a new category created by this project.                     |
| [Aquarimate](https://www.aquarimate.com/features/)                     | Livestock, equipment, tasks, analytics, activities, parameters, calculators, and cloud features.                                                 | Mature general aquarium managers already cover broad record keeping.                                               |
| [AquaticLog](https://www.aquaticlog.com/mobile)                        | Long-running aquarium logging, many parameters, imports, and controller-related integrations.                                                    | Breadth and charts alone will be compared with established products.                                               |
| [Reef Trak Home Assistant Bridge](https://reeftrak.com/homeassistant/) | A Home Assistant bridge for selected aquarium telemetry.                                                                                         | “Works with Home Assistant” is not, by itself, a unique claim.                                                     |
| [Oquari](https://oquari.com/en)                                        | A local Home Assistant-oriented aquarium controller.                                                                                             | Local aquarium automation already exists; safety and shrimp-specific interpretation matter more than connectivity. |

### 2.1 Relevant open-source projects

| Project                                                                                            | Fact and relevance                                                                                             | Caution                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [reef-pi](https://github.com/reef-pi/reef-pi)                                                      | An Apache-2.0 DIY aquarium controller covering temperature, pH, dosing, top-off, lighting, charts, and alerts. | It is reef/controller oriented, not an evidence-aware Caridina husbandry journal. Reuse ideas and protocols rather than rebuilding proven hardware control.                              |
| [reef-pi Home Assistant custom integration](https://github.com/tdragon/reef-pi-hass-custom)        | A practical reference for exposing controller data to Home Assistant.                                          | A custom integration creates an ongoing Home Assistant compatibility and maintenance obligation.                                                                                         |
| [AquaPi](https://github.com/TheRealFalseReality/aquapi)                                            | An Apache-2.0 aquarium project using ESPHome and Home Assistant.                                               | Hardware support and husbandry interpretation are separate product concerns.                                                                                                             |
| [AquaEye](https://github.com/alexantao/aquaeye)                                                    | An ESPHome-based monitor for pH, flow, level, temperature, and light.                                          | Its own documentation cautions that inexpensive probes may be low quality; sensor readings require calibration and provenance.                                                           |
| [Aquarium AI for Home Assistant](https://github.com/TheRealFalseReality/Aquarium-AI-Homeassistant) | Uses Home Assistant sensors/cameras with AI-task functionality and includes an AI fallibility disclaimer.      | AI summaries are not a scientific husbandry database and must not control life-support equipment.                                                                                        |
| [Aquola](https://aquola.app/) / [GitHub organization](https://github.com/aquola)                   | The product site advertises open source and self-hosting.                                                      | At the research snapshot, its public GitHub organization did not expose the claimed application implementation. Treat it as an emerging claim, not a validated reference implementation. |

## 3. Differentiation decision

### 3.1 Features that are not defensible alone

**Fact:** Competitors already offer most of the following: water logs, reminders, charts, species presets, breeding lines, loss tracking, remineralization calculators, offline operation, AI advice, equipment links, and Home Assistant plans or bridges.

**Conclusion:** Marketing should not claim “the first” or “the only” for any of those features without a new, documented market search at publication time.

### 3.2 Recommended product thesis

The strongest defensible combination is an **open, local, evidence-aware husbandry notebook for Caridina keepers**:

1. **Public and portable:** a real open-source license, self-hostable static build, versioned JSON export, and no mandatory account or cloud.
2. **Context before thresholds:** species or documented trade line, life stage, source, and tank history accompany every husbandry profile.
3. **Measurement provenance:** record unit, method/device, calibration time, temperature compensation, uncertainty/quality flag, and the originating Home Assistant entity where applicable.
4. **Water-batch traceability:** source water, remineralizer and lot, recipe, preparation date, measured EC/GH/KH, and tanks receiving the batch.
5. **Raw and derived values:** preserve raw conductivity; label derived TDS with its conversion factor and model.
6. **Breeding and outcomes:** link lines, crosses, moves, molts, berried events, juveniles, and losses to tank conditions without presenting temporal association as causation.
7. **Local telemetry:** use Home Assistant as an optional acquisition layer while keeping manual entry and export fully functional.
8. **Honest uncertainty:** surface source quality, stale sensors, missing calibration, ambiguous taxonomy, and incomplete records instead of manufacturing a single “health score.”

**Risk:** Individual elements can be copied. The durable advantage must come from coherent data modeling, trustworthy source governance, safe UX, documentation, and an active open-source community.

## 4. Aquaristic evidence and safe claims

### 4.1 What the evidence supports

**Facts**

- Holroyd et al., _An ecophysiological approach to improving health outcomes of ornamental shrimp during aquarium trade and transportation_ (2026), reviews temperature, oxygen, salinity, carbonate chemistry, and nitrogenous waste and identifies substantial evidence gaps. It argues for species-specific ecophysiological knowledge rather than generic treatment of ornamental shrimp: [PubMed](https://pubmed.ncbi.nlm.nih.gov/42445761/), [open full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC13360293/), [DOI](https://doi.org/10.1093/conphys/coag046).
- The genus Caridina contains roughly 300 described species and spans diverse freshwater habitats. A phylogenetic study illustrates both diversity and habitat complexity: [PubMed PMID 30423441](https://pubmed.ncbi.nlm.nih.gov/30423441/), [DOI landing page](https://doi.org/10.1016/j.ympev.2018.11.002).
- A controlled 2024 experiment cultured _Caridina multidentata_ and _Caridina typus_ at 20, 23, and 26 °C. Both reproduced at all tested temperatures, but species-specific responses differed and reproductive output decreased as temperature increased: [J-STAGE article and data summary](https://www.jstage.jst.go.jp/article/aquaticanimals/2024/0/2024_AA2024-5/_article), [DOI](https://doi.org/10.34394/aquaticanimals.2024.0_AA2024-5).
- The toxicity of ammonia in aquatic systems changes with environmental conditions including pH and temperature: [US EPA aquatic-life criteria for ammonia](https://www.epa.gov/wqc/aquatic-life-criteria-ammonia).
- Conductivity is an indicator of dissolved ions; it does not identify the ions or directly establish physiological suitability: [USGS Water Science Glossary](https://www.usgs.gov/water-science-school/science/water-science-glossary).
- TDS reported from conductivity depends on the selected conversion model/factor. Instrument documentation shows different factors for different standards: [Atlas Scientific EZO-EC data sheet](https://files.atlas-scientific.com/EC_EZO_Datasheet.pdf).

**Conclusions**

- “Caridina” is a genus, not a husbandry profile.
- The available evidence does not support one universal pH, GH, KH, TDS, conductivity, or temperature range for all Caridina species and trade lines.
- A field-habitat measurement is not automatically a captive optimum. A small laboratory study is not automatically a general care limit. A breeder target is valuable experience but is not equivalent to controlled scientific evidence.
- A single out-of-range observation should trigger verification and contextual review, not an automatic diagnosis or actuator command.

### 4.2 Required data and editorial model

Every supplied profile or range should carry:

- accepted scientific name where known, trade name/line, and taxonomic uncertainty;
- life stage and purpose, such as maintenance, breeding, larval rearing, or transport;
- parameter, unit, reference temperature, and whether the value is measured or derived;
- range type: field observation, laboratory result, published captive protocol, breeder practice, manufacturer guidance, or user-defined target;
- direct source, publication date, extraction note, reviewer, confidence, and last-reviewed date;
- explicit limitations and conflicts of interest.

The current domain model includes a `TargetRange`. Product copy and schema evolution should ensure that this remains an editable keeper target. Terms such as “healthy” and “critical” must not be assigned automatically unless a species- and context-specific source supports them.

### 4.3 Approved language patterns

- “Editable starting profile reported by [source] for [species/line and context].”
- “Outside your selected target; verify the measurement, calibration, recent events, and animal behavior.”
- “EC/TDS can reveal change in dissolved-ion load but does not identify ion composition or replace GH/KH and source-water records.”
- “This timeline shows an association; it does not establish cause.”
- “No current reading” or “sensor stale” instead of silently reusing the last value.

### 4.4 Language to avoid

- “All Caridina need …”
- “Universally safe,” “perfect,” or “guaranteed breeding” values.
- Diagnosing disease or cause of death from a chart or single measurement.
- “Any copper is lethal” or comparable absolute toxicity claims without species, chemical form, concentration, exposure, and test-method context.
- Automated dosing, heating, cooling, or water-change recommendations based only on a target-range violation.

## 5. Technology and architecture findings

### 5.1 Repository facts

The inspected repository pins the following baseline:

- Node.js `>=24.0.0`; Node 24.19.0 was the verified local runtime. The official [Node.js release table](https://nodejs.org/en/about/previous-releases) is the source of truth for maintenance status.
- React and React DOM 19.3.0 with React Router 7.18.3.
- TypeScript 6.0.3 with strict mode and `noUncheckedIndexedAccess`.
- Vite 8.3.0 and `vite-plugin-pwa` 1.3.0 with a prompt-based service-worker update flow.
- Dexie 4.4.6 over IndexedDB for local persistence.
- Zod 4.6.2 for runtime validation and i18next 26.4.2/react-i18next 17.0.13 for localization.
- Vitest 5.0.0 and Testing Library for unit/component tests.
- Playwright 1.63.0 and `@axe-core/playwright` 4.13.0 for end-to-end and automated accessibility checks.
- ESLint 10.10.0 with typed TypeScript rules.
- an MIT license identifier in `package.json`;
- no required application backend in the current v0.1 architecture.

**Version decision:** React 19.3 was adopted as a matched `react`/`react-dom` pair after the complete unit, build, accessibility, desktop, and mobile journey suites passed. TypeScript 7 was also available as a major toolchain transition ([TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)), but the typescript-eslint compatibility policy documented support below TypeScript 6.1 at this snapshot ([supported dependency versions](https://typescript-eslint.io/users/dependency-versions/)). TypeScript 6.0.3 therefore avoids an unsupported lint/compiler combination until that peer range changes.

Node 24 is the deliberate production baseline: it was an LTS line at the snapshot, while Node 26 was still Current. This follows Node's recommendation that production applications use Active LTS or Maintenance LTS releases rather than Current releases.

Vite 8 is the selected current-generation build tool ([Vite 8 announcement](https://vite.dev/blog/announcing-vite8)). The PWA deliberately prompts before applying an update, following the plugin's [prompt-for-update guidance](https://vite-pwa-org.netlify.app/guide/prompt-for-update), rather than replacing a data-entry session without warning.

Primary project documentation: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/docs/), [Vite](https://vite.dev/guide/), [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [Dexie](https://dexie.org/docs/), [Zod](https://zod.dev/), [i18next](https://www.i18next.com/), [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro), and [vite-plugin-pwa](https://vite-pwa-org.netlify.app/).

### 5.2 Architecture conclusions and risks

**Conclusions**

- A static, offline-first PWA matches the privacy goal and keeps initial operating cost and attack surface low.
- Dexie plus versioned, schema-validated export is appropriate for the present dataset size and offline workflow.
- Strict TypeScript plus Zod provides complementary compile-time and runtime boundaries for imports, migrations, and external telemetry.
- Prompting before service-worker activation is preferable for a data-entry app because an update should not unexpectedly replace the running UI during work.

**Risks**

- IndexedDB is browser-profile and origin scoped. Clearing site data, changing origin, browser eviction, profile loss, or a faulty migration can remove access to data. A tested export/restore path and prominent backup reminders are product requirements, not optional polish. See [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) and the [Storage Standard](https://storage.spec.whatwg.org/).
- Local-only storage does not provide multi-device merge, remote recovery, or guaranteed long-term persistence.
- Changing a hosted origin or GitHub Pages base path creates a separate storage origin/path behavior that must be migration-tested.
- Third-party data import and future Home Assistant telemetry are untrusted inputs and must pass schema, unit, finite-number, timestamp, and identifier validation.
- The current Content Security Policy allows only same-origin connections and local WebSockets. A future Home Assistant connector needs a deliberately scoped policy change; wildcard network access is not acceptable.

## 6. GitHub and release findings

### 6.1 Hosting

**Fact:** Vite produces a static build suitable for static hosting. Its official deployment guide documents GitHub Pages through GitHub Actions and requires the correct repository base path: [Vite static deployment guide](https://vite.dev/guide/static-deploy.html#github-pages). GitHub separately documents [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

**Conclusion:** GitHub Pages is a suitable optional host for the static PWA. The repository’s `CARIDINA_BASE_PATH` configuration is compatible with project-site paths. CI should build with the intended base path and test deep-link navigation, manifest/icon URLs, service-worker scope, update behavior, and offline reloads before deployment.

**Risk:** Hosting the shell does not back up IndexedDB data. Users may incorrectly assume that a hosted app account exists; copy must state clearly where data lives.

### 6.2 Open-source readiness

GitHub’s [community profile guidance](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories) identifies README, LICENSE, CONTRIBUTING, code of conduct, issue templates, and security policy as core community-health files.

Before calling the project release-ready:

1. Include an actual MIT `LICENSE` file, not only package metadata.
2. Document supported browsers, local-data behavior, backups, migrations, scientific limitations, and the no-automatic-control safety boundary.
3. Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates, and `SECURITY.md` with private vulnerability-reporting instructions. See [GitHub security-policy guidance](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository).
4. Protect the default branch; require format, lint, typecheck, unit, accessibility, end-to-end, build, and security checks.
5. Enable Dependabot/security updates and dependency review where available. See [GitHub dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review).
6. Pin third-party Actions to immutable commit SHAs, grant minimum workflow permissions, and review generated artifacts before Pages deployment. Follow GitHub's [secure use reference for Actions](https://docs.github.com/en/actions/reference/security/secure-use).
7. Do not publish real user backups, tokens, tank-location metadata, or sensor endpoint details in fixtures, issues, screenshots, or CI logs.

## 7. Accessibility findings

### 7.1 Standard and status

**Fact:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/) is the current W3C Recommendation and adds criteria including Focus Not Obscured, Dragging Movements, Target Size, Redundant Entry, and Accessible Authentication. The [W3C overview](https://www.w3.org/WAI/standards-guidelines/wcag/) recommends use of the latest WCAG 2 version.

**Conclusion:** CaridinaKeeper should target **WCAG 2.2 Level AA** for every supported responsive state and language.

**Risk:** Installing axe and adding a skip link are useful implementation steps, not evidence of conformance. W3C states that conformance applies to complete pages and relies on both automated and human evaluation. No conformance claim should be made until representative flows have been manually tested and recorded.

### 7.2 Required release checks

- Use native HTML landmarks, headings, labels, buttons, tables, and form controls before adding ARIA. Follow the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/).
- Complete all workflows by keyboard alone with visible, unobscured focus and logical focus order.
- Provide a non-drag alternative for every drag interaction and meet WCAG 2.2 minimum target-size requirements.
- Test text and non-text contrast in light/dark themes; never encode water status or severity by color alone.
- Associate validation errors with fields, provide a summary where useful, retain entered values, and avoid repeated entry.
- Announce asynchronous save, import, offline, update, and error states without unexpectedly moving focus.
- Provide text/table equivalents for charts and ensure tooltips are keyboard and touch accessible.
- Test at 200% zoom and narrow reflow without two-dimensional scrolling for ordinary content.
- Honor reduced-motion preferences and the application setting; do not require animation to understand state.
- Localize visible text, accessible names, dates, decimals, and units consistently. Set the document language correctly after locale changes.
- Test destructive dialogs, menus, date inputs, route transitions, and toast/status regions with at least current NVDA/Firefox and VoiceOver/Safari combinations, plus mobile touch exploration where supported.
- Run Playwright/axe in CI, but supplement it with keyboard, screen-reader, zoom/reflow, forced-colors, and high-contrast manual checks. W3C provides an [evaluation tools overview](https://www.w3.org/WAI/test-evaluate/tools/selecting/).

## 8. Decision register

| Decision                                                      | Evidence-based rationale                                                                                                | Revisit trigger                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Keep `CaridinaKeeper` as the working project name.            | No exact indexed collision was found; the name communicates purpose.                                                    | Commercial launch, funding, app-store submission, or an adverse similarity search.               |
| Avoid universal built-in “safe” values.                       | Species diversity and the published evidence gap make universal ranges scientifically indefensible.                     | A species/context-specific profile receives traceable evidence and expert review.                |
| Position around provenance and local ownership.               | Competitors already cover generic logs and reminders; few make evidence quality and measurement lineage the core model. | User research shows a different high-value workflow.                                             |
| Keep v0.1 local-first and backend-free.                       | It supports privacy, offline use, simple hosting, and low operational risk.                                             | Multi-device sync, collaboration, or a secure HA bridge becomes a validated requirement.         |
| Target WCAG 2.2 AA without making an early conformance claim. | It is the current W3C target; automated tools cannot prove full conformance.                                            | A documented audit covers the complete release surface.                                          |
| Treat Home Assistant as telemetry first.                      | Read-only acquisition provides value without creating life-support actuation risk.                                      | A separate safety case, threat model, and independently fail-safe hardware design are completed. |

## 9. Research limitations

- Search results, app features, repository activity, domains, and registry data can change after the snapshot date.
- Product-page statements were not independently tested.
- The name review is preliminary and not a professional clearance search.
- The aquaristic literature is incomplete and often species-, life-stage-, population-, water-chemistry-, or protocol-specific.
- No numeric husbandry values are proposed here because the reviewed evidence does not justify universal Caridina thresholds.
- Accessibility observations define a target and test plan; they do not constitute an audit or legal determination.
