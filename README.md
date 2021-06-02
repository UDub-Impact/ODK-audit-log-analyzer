# ODK-audit-log-analyzer

This repository is maintained by Impact++, a student-run RSO at UW Seattle, focused on helping students contribute to the open source world.

The goal of this software is to allow users in ODK Collect to analyze `audit.csv` file generated by form submissions
filled out by data collectors.

Potential usage includes:
- give a trend plot on how long each form takes to be filled out as time goes on
- give average time each question takes
- flag the questions which users edit their answers frequently
- flag fake data collectors

This is a [ODK forum thread](https://forum.getodk.org/t/audit-log-analyzer-idea/33351) with regards to what features this software should provide.

# Usage
1. clone this repo
2. go to `/src` folder of this repo
3. open `main.html`
4. click on the `open` button in the html page, select the audit file (e.g. `audit_log.csv`) you want to analyze
5. in the dropdown menu, select the kind of chart you want to visualize.
6. see the visualization!!

---
*Note: this software is still under active development.*
