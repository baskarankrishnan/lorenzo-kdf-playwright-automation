# KDF Repository Gap Report (Bucket C)
Generated: 2026-08-02T06:26:31.848Z

## 1. Missing PAGES (page name not in ElementRepository) — 8 pages
These pages must be added to ElementRepository_Lorenzo_3.json with real locators captured from the live app.

- **pageCreatenote** (8 steps)
    - LSTP_MSI_WF001.json step 71 (sli_searchicon)
    - LSTP_MSI_WF001.json step 73 (btn_Advancedsearch)
    - LSTP_MSI_WF001.json step 75 (txt_Notename)
    - LSTP_MSI_WF001.json step 76 (btn_Find)
    - LSTP_MSI_WF001.json step 78 (tbl_selectnote)
    - LSTP_MSI_WF001.json step 79 (btn_Next)
    - LSTP_MSI_WF001.json step 81 (txt_note)
    - LSTP_MSI_WF001.json step 82 (btn_FInishnow)
- **pageFinalise** (2 steps)
    - LSTP_CDC_WF001.json step 137 (cmb_Action)
    - LSTP_CDC_WF001.json step 138 (btn_Finish)
- **pagePatient transfer** (10 steps)
    - LSTP_IP_WF001.json step 66 (icn_SFSCP)
    - LSTP_IP_WF001.json step 67 (txt_IDCP)
    - LSTP_IP_WF001.json step 68 (btn_FindNowCP)
    - LSTP_IP_WF001.json step 69 (btn_OKCP)
    - LSTP_IP_WF001.json step 70 (cmb_WardTransfer)
    - LSTP_IP_WF001.json step 71 (cmb_ReasonforTransfer)
    - LSTP_IP_WF001.json step 72 (btn_Finish nowCP)
    - LSTP_TaskMgmt_FloorPlan_WF001.json step 111 (cmb_WardTransfer)
    - LSTP_TaskMgmt_FloorPlan_WF001.json step 112 (cmb_ReasonforTransfer)
    - LSTP_TaskMgmt_FloorPlan_WF001.json step 113 (btn_Finish nowCP)
- **pageReportBuilder** (10 steps)
    - LSTP_Reports_WF001.json step 11 (lbl_SearchTitle)
    - LSTP_Reports_WF001.json step 12 (txt_DisplayName)
    - LSTP_Reports_WF001.json step 13 (cmb_Category)
    - LSTP_Reports_WF001.json step 14 (cmb_Category)
    - LSTP_Reports_WF001.json step 15 (cmb_SubCategory)
    - LSTP_Reports_WF001.json step 16 (cmb_SubCategory)
    - LSTP_Reports_WF001.json step 17 (btn_Find)
    - LSTP_Reports_WF001.json step 19 (tbl_ReportResults)
    - LSTP_Reports_WF001.json step 20 (tbl_SelectReport)
    - LSTP_Reports_WF001.json step 21 (btn_Next)
- **pageReportConfiguration** (4 steps)
    - LSTP_Reports_WF001.json step 23 (lbl_ConfigTitle)
    - LSTP_Reports_WF001.json step 24 (chk_LaunchPreview)
    - LSTP_Reports_WF001.json step 25 (chk_LaunchPreview)
    - LSTP_Reports_WF001.json step 26 (btn_Next)
- **pageReportPrintPreview** (2 steps)
    - LSTP_Reports_WF001.json step 33 (frm_PreviewWindow)
    - LSTP_Reports_WF001.json step 34 (btn_ClosePreview)
- **pageReportRunRoadmap** (3 steps)
    - LSTP_Reports_WF001.json step 28 (lbl_RunRoadmap)
    - LSTP_Reports_WF001.json step 29 (btn_GenerateNow)
    - LSTP_Reports_WF001.json step 31 (btn_FinishNow)
- **pageReportingServices** (3 steps)
    - LSTP_Reports_WF001.json step 8 (lbl_PageTitle)
    - LSTP_Reports_WF001.json step 9 (btn_NewReport)
    - LSTP_Reports_WF001.json step 36 (tbl_ReportGrid)

## 2. Missing ELEMENTS (page exists, element name not found) — 6

- **pageBookWardappointment::cmb_BookingPriority** — used by: LSTP_Maternity_WF001.json step 47
- **pageBookWardappointment::cmb_SelectReferral** — used by: LSTP_Maternity_WF001.json step 46
- **pageHome::lnk_MyWork** — used by: LSTP_CaseLoad_WF001.json step 5
- **pageIPSMBasicSearchCriteria::chk_SelectBed** — used by: LSTP_Maternity_WF001.json step 45
- **pageIPSMBasicSearchCriteria::cmb_IntendedManagement** — used by: LSTP_Maternity_WF001.json step 41
- **pageMedicationadministrationchart::txt_Duenow** — used by: LSTP_ePMA_WF001.json step 164

## 3. Junk-target references (element only maps to a malformed repo page like "page..") — 5
Repository data-quality issue: these element names exist ONLY under placeholder/whitespace page names.

- LSTP_TaskMgmt_FloorPlan_WF001.json step 14: lnk_Floorplan declared "pageInpatient" -> only repo page is junk "page.."
- LSTP_TaskMgmt_FloorPlan_WF001.json step 16: icn_Emptybubble declared "pageIPPegboardCurrentView" -> only repo page is junk "page.."
- LSTP_TaskMgmt_FloorPlan_WF001.json step 104: lnk_Floorplan declared "pageInpatient" -> only repo page is junk "page.."
- LSTP_TaskMgmt_FloorPlan_WF001.json step 106: icn_select bubble declared "pageIPPegboardCurrentView" -> only repo page is junk "page.."
- LSTP_TaskMgmt_FloorPlan_WF001.json step 107: icn_select bubble declared "pageIPPegboardCurrentView" -> only repo page is junk "page.."

## 4. Ambiguous references (generic element under many pages — needs manual page selection) — 7

- LSTP_Maternity_WF001.json step 42: cmb_ServiceType declared "pageIPSMBasicSearchCriteria" -> 3 candidate pages
- LSTP_Maternity_WF001.json step 43: btn_Find declared "pageIPSMBasicSearchCriteria" -> 28 candidate pages
- LSTP_Maternity_WF001.json step 117: btn_Add declared "pageNewborndetails" -> 9 candidate pages
- LSTP_TaskMgmt_FloorPlan_WF001.json step 29: btn_BookFinishnow declared "pageBookWardappointment" -> 2 candidate pages
- LSTP_TaskMgmt_FloorPlan_WF001.json step 41: lnkTaskPanePatient declared "pageIPPegboardCurrentView" -> 3 candidate pages
- LSTP_TaskMgmt_FloorPlan_WF001.json step 109: lnkTaskPanePatient declared "pageIPPegboardCurrentView" -> 3 candidate pages
- LSTP_WA_WF001.json step 48: btn_Yes declared "pageWarning" -> 13 candidate pages
