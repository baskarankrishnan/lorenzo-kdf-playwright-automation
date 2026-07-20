// pageHome
// Task-pane link (Record allergy/ADR). Was referenced by CPPView but missing.
export const lnk_RecordAllergy = "//li[normalize-space()='Record allergy/ADR']";
export const tab_Patients = "//td[@caption='Patients'][@key='TB_PATNT']";
export const tab_MyWork = "//td[@title='My work']";
export const tab_InTheatre = "//td[@title='In theatre']";
export const lnkTaskPaneMyWork = "//span[@class='T_PL' and normalize-space()='<variable>']";
export const lnkSubTaskPaneInpatient = "(//div[contains(@atei,'Inpatient')]//span[text()='<variable>'])[2]";
export const lnkSubTaskPaneInpatientWithPAT = "//div[contains(@atei,'Inpatient')]//span[text()='<variable>']";
export const lnkSubTaskPaneEmerCurrentView = "//div[contains(@atei,'Current view')]//span[text()='<variable>']";
export const lnkSubTaskPaneTheatre = "//div[contains(@atei,'Theatre')]//span[text()='<variable>']";
export const lnkSubTaskPaneMedication = "//div[contains(@atei,'Medication')]//span[text()='<variable>']";
export const lnkTaskPanePatient = "//span[normalize-space()='Find record']";
export const txt_Identifier = "//input[@title='Enter an identifier']";
export const btn_Find = "//button[.//td[normalize-space()='Find']]";
export const btn_ClinicFind = "//td[@title='Find']";
export const btn_Logout = "//img[@title='Exit']";
export const txt_Yes = "//td[@title='Yes']";
export const btn_Login = "//input[@id='btnSubmit']";
export const lnk_Intray = "//span[normalize-space()='In-tray']";
export const btn_Findrecord = "//span[normalize-space()='Find record']";
// DUPLICATE of tab_Mywork (superseded by the Theatres definition later in file; unused by tests) — commented.
// export const tab_Mywork = "//td[@caption='Patients'][@key='TB_PATNT']";
export const lbl_popup = "//p['Question - LORENZO']";
export const btn_Yes = "//td[@title='Yes']";
export const tab_Clinic = "//span[@class='T_PL' and normalize-space()='Clinics']";
export const txt_Clinicname = "//input[@dikey='itxtClinicname']";
export const SelectSession = "//img[@alt='Click to select row' and @title='Click to select row']";
// DUPLICATE of btn_OK (superseded by the caseload-section definition later in file; use btn_CliOK for the clinic OK) — commented.
// export const btn_OK = "//button[@title='OK'][contains(@class, 'Command_Normal')]";
export const btn_CliOK = "//td[contains(@title,'OK')]";
export const btn_No = "//td//img[@title='No']";
// DUPLICATE of btn_OK (identical to btn_CliOK above; superseded by the caseload-section definition later) — commented.
// export const btn_OK = "//td[contains(@title,'OK')]";
export const lnk_Book = "//span[@class='T_PL' and normalize-space(text())='Book']";
export const lnk_ClinicsSubLink = "//span[normalize-space()='Edit Booking']";
export const lnk_ManageAppointmentStatus = "//li[@id='itTT_C20_4']//span[contains(@class,'T_PL')][normalize-space()='Manage Appointment Status']";
export const lnk_Theatre = "//span[normalize-space()='Theatre']";
export const lnk_BookTheatre = "//span[normalize-space()='Book']";
export const tab_Bookingdetails = "//nobr[normalize-space()='Booking details']";
export const ink_Modifybooking = "//span[normalize-space()='Modify booking']";
export const tab_Intheatre = "//td[@title='In theatre']";
export const btn_Clinicalnote = "//td[@id='ieprtab_Tab_C5_iepr_Tabs_C5_15']";
export const lnk_Createnote = "//span[normalize-space()='Create note']";
export const sli_Splittericon = "//div[@id='divSplitter']";
export const txt_Notenameverify = "//label[@dikey='ilblShowTemplateName']";
export const lnk_printnote = "//span[normalize-space()='Print note']";
export const btn_Letters = "//td[@id='ieprtab_Tab_C5_iepr_Tabs_C5_18']";
export const lnk_Createdocument = "//li[@key='MN_DOC_CREATE']";
export const lnk_printdocument = "//span[normalize-space()='Print document']";
export const txt_Formsnameverify = "//label[@dikey='lblName']";
export const lnk_Correct = "//span[normalize-space()='Correct']";
export const lnk_FormsFinalise = "//span[normalize-space()='Finalise Form']";
export const lnk_Copyform = "//span[normalize-space()='Copy form']";
export const icn_filterRiteria = "//img[@title='Select a filter criteria']";
export const cmb_Struckout = "//td[@title='Struck out' and text()='Struck out']";
export const tab_Detailstab = "//nobr[contains(., 'Details')]";
export const txt_Formstatus2 = "//textarea[@id='it_C_C13' and @dikey='txtStatus']";
export const lnk_Printform = "//span[normalize-space()='Print Form']";
export const btn_Logout_10 = "//img[@title='Exit']";
export const txt_Yes_10 = "//td[@title='Yes']";
export const btn_Logout_11 = "//img[@title='Exit']";
export const txt_Yes_11 = "//td[@title='Yes']";
export const btn_Logout_12 = "//img[@title='Exit']";
export const txt_Yes_12 = "//td[@title='Yes']";
export const lnk_EditBooking = "//li[@id='itTT_C20_67']//span[@class='T_PL'][normalize-space()='Edit booking']";
// DUPLICATE of lnk_AdmitTaskPane (superseded by the T_PL definition later in file) — commented.
// export const lnk_AdmitTaskPane = "(//span[text()='Admit'])[1]";
export const lbl_Wards = "//td[@id='pht_Wards']";
export const chk_WardName = "//tr[.//span[normalize-space(text()) = '<variable>']]/td[@imgtype='CheckBox']//img";
export const tbl_IPPegboardGrid = "//table//div[@id='g_JSCTLC4']";
export const tab_InpatientHistory = "//td[@key='TB_PEGHISTORY']";
export const lnk_ModifyAdmitTaskPane = "(//div[contains(@atei,'Inpatient')]//span[text()='Modify Admit'])[1]";
// DUPLICATE of btn_Finish (superseded by the coding-section definition later in file) — commented.
// export const btn_Finish = "//span[normalize-space()='Finish']";
export const lbl_Gender = "//label[text()='Gender']";
export const cmb_Gender = "//input[@title='Enter a gender value']";
export const ico_Gender = "//img[@title='Enter a gender value']";
export const btn_Next = "//td[@title='Next']";
// DUPLICATE of btn_PopUpNo — identical to the definition later in file; commented.
// export const btn_PopUpNo = "//td[@class='Cmd_TTE'][@title='No']";
export const txt_Forename = "//input[@dikey='itxtForename']";
export const txt_Title = "//input[@title='Select title']";
export const txt_Middlename = "//input[@title='Enter Middle Name']";
export const lbl_Wards1 ="(//img[@title='Check the value'])[3]";
export const lbl_PatientBookBanner = "(//td[@class='CxtBar_TD6'])[1]";
export const lnk_Summary = "//nobr[normalize-space(.)='Summary']";
export const lnk_SocialInformation = "//nobr[text()='Social information']";
export const txt_UsualCurrentName = "//span[text()='Usual/Current Name']";
export const lnk_EPRRelationships = "//td[@key='TB_RELNS']";
export const txt_RelRole = "//label[@dikey='ilblRelationship']";
export const txt_CP = "//nobr[normalize-space(.)='Care providers']";
export const txt_CPID = "//label[@dikey='ilblMainId']";
export const btn_GeneraldetailsEPR = "//td[@id='ieprtab_Tab_C5_iepr_Tabs_C5_5']";
export const txt_PASID = "//label[@dikey='lblPatientIdValue']";
export const txt_PASNUMBER = "(//td[@icn='Identifier'])[3]";
export const lnk_Identifiers = "//nobr[normalize-space()='Identifiers']";
export const txt_NHSNUMBER = "(//td[@icn='Identifier'])[2]";
export const lnk_Additionaldemographics = "//nobr[normalize-space()='Additional demographics']";
export const lnk_Preferences = "//nobr[normalize-space()='Preferences']";
export const txt_Communicationlanguage = "//span[text()='Communication language']";
export const txt_CountryOfBirth = "//label[@dikey='ilblCountryOfBirth']";
export const txt_placeofbirth = "//label[@dikey='ilblPlaceOfBirth']";
export const txt_Nationality = "//label[@dikey='ilblNationality']";
export const txt_Religion = "//label[@dikey='ilblReligion']";
export const txt_Sexualorientation = "//label[@dikey='ilblSexualOrientation']";
export const txt_Ethnicity = "//label[@dikey='ilblEthnicity']";
export const lnk_Othernames = "//nobr[normalize-space()='Other names']";
export const txt_RelSurname = "(//td[@icn='SurName'])[2]";
export const lnk_ContactInformation = "//nobr[normalize-space()='Contact information']";
export const txt_Addresstype = "//span[normalize-space()='Usual Address']";
export const txt_Postalcode = "(//span[@class='hdnowrap'])[8]";
export const btn_Referral = "//td[@caption='Re&ferrals']";f
export const lnk_CreateReferral = "//span[text()='Create referral']";
export const btn_TaskEPR = "//td[@key='TB_TASKS']";
export const txt_TempID = "//label[@id='il_C_C1']";
export const lbl_popup_Temptofullreg = "//div[@id='txtMessage']";
export const btn_Forms = "//td[@id='ieprtab_Tab_C5_iepr_Tabs_C5_3']";
export const btn_Medication = "//td[@key='TB_MEDICATIONBB_P2' and normalize-space()='Medication']";
export const btn_MedicationClerking = "//span[normalize-space()='Medication clerking']";
export const lbl_popupReviewmedication = "//div[@id='txtMessage']";
export const btn_Overview = "//td[@key='TB_SUMRY']";
export const btn_EPRTab = "//td[@id='ieprtab_Tab_C5_iepr_Tabs_C5_14']";
export const lnkSubTaskPaneNewReport= "//span[text()='New report']";
export const ico_HeadingInfos = "//p[normalize-space(.)='Question - LORENZO']";
export const lbl_ConfirmationTexts = "//div[@id='txtMessage']";
export const btn_PopUpYes = "//td[@title='Click to confirm the cancellation of the care activity']";
export const lbl_ConfirmationText = "//div[@id='txtMessage']";
export const btn_PopUpOk = "//td[@class='Cmd_TTE'][@title='Ok']";
export const ico_HeadInfo = "//p[text()='Select document templates - LORENZO']";
export const btn_CancelDT = "//td[@title='Cancel']";
export const ico_HeadingIn = "//p[contains(., 'Warning')]";
export const lbl_ConfirmationTextss = "//div[@id='txtMessage']";
export const ico_HeadingInfo = "//p['Information - LORENZO']";
export const tbl_Verifystatus = "//td[@title='Volume dispatched']";
// DUPLICATE of lnk_AdmitTaskPane (superseded by the T_PL definition later in file) — commented.
// export const lnk_AdmitTaskPane = "//li[@id='itTT_C20_11']";
export const cmb_Entity = "//input[@id='icombobox_Text_C1']";
export const txt_Identifierc = "//input[@id='it_C_C5']";
export const btn_Findc = "//td[@title='Click to Find']";
export const btn_Okc = "//td[normalize-space(.)='OK']";
export const txt_Surnamec = "//input[@id='it_C_C7']";
export const chk_Selectcheckboxs = "//img[@title='Click to select row' and contains(@src,'g_cu.gif')]";
export const chk_Selectcheckbox = "//input[@type='checkbox' and @data-role='checkbox' and @aria-label='Select row']";
export const btn_Coding = "//span[normalize-space()='Coding']";
export const lnk_Code = "//span[normalize-space()='Code']";
export const btn_Close = "//a[@id='dialog_close_0']";
export const rad_Codes = "//table[@id='iO_C_C12']//tr[@caption='Code']";
export const cmb_Category = "//img[@id='icombobox_Image_C8']";
export const cmb_Codingscheme = "//img[@id='icombobox_Image_C10']";
// DUPLICATE of cmb_Status (brittle auto-id) — superseded by the @title='Select status' definition later in file; commented.
// export const cmb_Status = "//input[@id='icombobox_Text_C39']";
export const btn_Finish = "//span[.//span[normalize-space()='F'] and contains(normalize-space(.),'Finish')]";
export const lnk_ReCode = "//span[normalize-space()='Recode']";
export const btn_Finishnowrc = "//td[@title='Finish now']";
export const img_Codeset = "//img[@id='imgCode']";
export const lnk_Updatecode = "//span[normalize-space()='Update code']";
export const btn_Nextc = "//td[@title='Next']";
export const txt_Codes = "//input[@dikey='txtCode']";
export const img_But = "//img[@id='ic_I_C18']";
export const txt_Surname = "//input[@dikey='itxtSurname']";
// DUPLICATE + SWAPPED (cmb_Gender must be the input, lbl_Gender the label) — superseded by the correct definitions earlier in file; commented.
// export const cmb_Gender = "//label[text()='Gender']";
// export const lbl_Gender = "//input[@title='Enter a gender value']";
export const txt_DOB = "//input[@class='DP_TB_Text']";
export const btn_PatientSummaryView = "//nobr[normalize-space(.)='Summary']";
export const txt_PatientTitle = "//label[@title='Admiral']";
export const txt_PatientSurname = "//label[@dikey='lblSurnameValue']";
export const txt_PatientForename = "//label[@dikey='lblForenameValue']";
export const txt_PatientTelHome = "//label[@dikey='lblTeleHomeValue']";
export const txt_PatientTelMobile = "//label[@dikey='lblTeleMobileValue']";
export const txt_PatientEmail = "//label[@dikey='lblEmailAddrValue']";
export const lnk_WardAttendance = "//nobr[text()='Ward attendance']";
export const tbl_WardAttendance = "//div[@id='g_JSCTLC0'][contains(@class, 'k-grid')]";
export const lnk_BookWardAttendance = "(//span[text()='Book ward attendance'])[2]";
export const status_Event = "//span[@class='k-column-title'][text()='Event']";
export const lnk_EditBookingWA = "//span[normalize-space()='Edit booking']";
export const btn_Slider = "//div[@id='divSplitter']";
export const sli_Sliderdetail = "//div[@id='divDetails']";
export const btn_Sliderexpand = "//div[@id='divSplit']";
export const lbl_Eventstatus = "//label[@dikey='lblEventstatusValue']";
export const lnk_ManageattendanceWA = "//span[normalize-space()='Manage attendance']";
export const tab_Mywork = "//td[@key='TB_FS_MAIN_THEATRES']";
export const sublnk_Theatre = "//span[text()='Theatre']";
export const txt_verifyTheatre = "//td[@ival='Booked']";
export const btn_modifyOK = "//td[@title='Ok']";
export const txt_verifyprofile = "//td[@icn='Operationprofilecode']";
export const txt_verifyPriority = "//td[@icn='Priority']";
export const btn_ClearTheatreSuite = "//tr[@id='RTheatreSuite']//button[@title='Clear']";
export const lst_TheatreSuite = "//td[@title='<variable>']";
export const lst_SessionStatus = '//td[@title="<variable>"]';
export const btn_FindTS = "//button[@title='Find']";
export const lbl_Identifier = "//label[@title='Identifier']";
export const btn_FindFR= "//img[@title='Click to Find']";
export const btn_OKFR= "//button[@title='Click to add the selected patient']";
export const lbl_AllPatients = "//div[text()='All patients']";

// DUPLICATE of btn_OK (superseded by the caseload-section definition later; use btn_OKFR to add a patient) — commented.
// export const btn_OK = "//button[@title='Click to add the selected patient']";
export const btn_PopUpNo = "//td[@class='Cmd_TTE' and @title='No']";
export const btn_DocTempCancel = "//td[@title = 'Cancel']"
export const lnkTaskPaneCreateRef = "//li[@id='itTT_C20_0']";
export const chk_Managereferral = "//td[@text='Manage referral']";
export const btn_AdRefMng_ok = "//button[.//td[normalize-space(.)='Ok']]";
export const btn_AdRefMng_Cancel = "//button[.//td[normalize-space(.)='Cancel']]";
export const tbl_SelectRow = "//tr[@id='igRowC6_0']//img[@onkeydown='C6.RCKeyDown(0)']";
export const tbl_RequestStatus = "//span[normalize-space()='Request Status']";
export const btn_PromptYes = "//img[@id='ic_I_C0' and @title='Yes']";
export const lnk_MarkasObsolete = "//span[normalize-space()='Mark as Obsolete']";
export const btn_ProceduresInterventions = "//td[@tabaccesskey='P']"
export const lnk_RecordProcedure = "//li[@title='Record procedure']"
export const txt_ProcedureName = "//td[@icna = 'Name']"
export const txt_ProcedureStatus = "//td[@icna = 'Status']"
export const txt_ProcedurePerformedDate = "//td[@icna = 'PerformedDateTime']"
// pageHistoryTab
export const tab_Alerts = "//nobr[text()='Alerts']/parent::td";
export const tab_Allergies = "//nobr[text()='Allergies/ADRs']/parent::td";
export const tab_Problems = "//nobr[text()='Problems']/parent::td";
export const btn_NewProblem = "//td[@title = 'Click to record new problem']";
export const lnk_Registrationtemporary = "//span[text()='Registration - temporary']";

// pageLIMainViewResource
export const chk_DisplayInactiveAllergies = "//td[@caption='Display inactive allergies/ADRs']";
export const chk_DisplayStruckoutAllergies = "//td[@caption='Display struck out allergies/ADRs']";
export const txt_AllergyStatus = "//td[@icn = 'AllergyStatus']/span";
export const txt_Allergytype = "//td[@icn = 'AllergyType']/span";
export const txt_Allergen_LV = "(//td[@icn = 'Allergen']/span)[2]";
export const txt_Allergy_InfoSource = "//td[@icn = 'InformationSource']/span";
export const txt_Allergy_OnsetDate = "//td[@icn = 'OnSetDttm']/span";
// pageRiskListView
export const chk_DisplayInactiveAlert = "//td[normalize-space()='Display inactive alert']";
export const chk_DisplayStruckoutAlert = "//td[normalize-space()='Display struck out alert']";
export const txt_Alerttype = "//td[@icna = 'Risk Type']";
export const txt_Alertname = "//td[@icna = 'Risk Name']";
export const txt_InformationSource = "//td[@icna = 'Information Source']";
export const txt_AlertStatus = "//td[@icna = 'Status']";
// Page Related People
export const btn_RelatedPeople = "//td[@id='ieprtab_Tab_C5_iepr_Tabs_C5_9']";
export const btn_Cancel = "//button[@id='ic_C_C2']";
export const lnk_Relationship = "//li[@title='Manage relationships']";
export const lnk_AdmitTaskPane = "//span[@class='T_PL' and text()='Admit']";
export const lnk_ViewEPR = "//li[@title='View EPR']";

// pageDetails Tab
export const cmb_ProblemType = "//input[@title = 'Select problem type']";
export const icn_SelectProblem = "//img[@title = 'Select problem name / code']";
export const txt_SearchText = "//input[@title = 'Enter searched term']";
export const cmb_Pattern = "//input[@title = 'Select a search pattern']";
export const img_Search = "//img[@title = 'Click to search a term']";
export const btn_PrbOk = "//td[@title = 'Click to select the term']";
export const chk_Encounters = "//td[@title = 'All encounters and episodes']/img";
export const btn_Save = "//td[@title = 'Save']";
export const lbl_Problems1 = "(//tr[contains (@class, 'k-table-row')])[2]/td[8]";
export const lbl_ProblemStatus1 = "(//tr[contains (@class, 'k-table-row')])[2]/td[11]";
export const lbl_Problems2 = "(//tr[contains (@class, 'k-table-row')])[3]/td[8]";
export const lbl_ProblemStatus2 = "(//tr[contains (@class, 'k-table-row')])[3]/td[11]";
export const lbl_ProblemScope2 = "(//tr[contains (@class, 'k-table-row')])[3]/td[15]";
export const lnk_MarkasMainProblem = "//li[@id = 'MarkasMainProblem']";
export const btn_SelectScope = "//img[@title='Select scope details']";
export const tab_Status = "//td[@key = 'Status']";
export const cmb_Status = "//input[@title = 'Select status']";
export const cmb_Reason = "//input[@title = 'Select reason for de-activation']";
export const dte_DeactivationDate = "//label[@dikey = 'ilblDeactivationDate']";
export const lnk_Link = "//li[@id = 'Link']";
export const lbl_Link = "(//tr[contains (@class, 'k-table-row')])[2]/td[6]"
export const lbl_LinkProcedure = "(//td[@icn = 'Namecode'])[2]/nobr"
// pageScope SFS
export const img_MarkasMain = "//td[@title='Mark as main']";
export const btn_Ok = "//td[@title = 'Ok']";
export const chk_Selectrow = "//img[@title='Click to unselect row']";
export const img_ExpandRow = "//img[@alt='Click to expand row']";
//Careplan
export const lnk_CreateCareplan = "//li[@title='Create care plan']";
export const lbl_CareplanName = "//td[@icna = 'CarePlanName']";
export const lbl_CareplanStatus = "//td[contains(text(),'Careplan template01')]/following-sibling::td[@icna='Status']";
export const btn_EPRTabSclUp = "//img[contains(@src,'ieprtabscrollup')]";
export const btn_EPRTabScldown = "//img[contains(@src,'ieprtabscrolldown')]";
export const lnk_ModifyCareplan = "//li[@title='Modify care plan']";
export const lnk_CopyCareplan = "//li[@title='Copy care plan']";
export const lnk_ManageStatus = "//li[@title='Manage status']";
export const lbl_CareplanName2 = "(//td[@icna = 'CarePlanName'])[2]";
export const lbl_CareplanStatus2 = "//td[contains(text(),'Careplan template02')]/following-sibling::td[@icna='Status']";

// page EPR tab
export const tab_Overview = "//td[@id='ieprtab_Tab_C5_iepr_Tabs_C5_1']";

// Task link from EPR

//Additional Options - Lorenzo
export const tgl_FilterBY = "//td[@title='Filter by ']";
export const txt_ValueSelect = "//td[@ival='Show all referrals']"
export const lnk_TaskPaneModifyReferral ="//li[@caption='Modify referral']";
export const lnk_TaskPaneManageReferral = "//li[@caption='Manage referral']";
export const lnk_TaskPaneCloseReferral = "//li[@caption='Close referral']";
export const lnk_TaskPaneReOpenReferral = "//li[@caption='Reopen referral']";
export const lbl_ReferralStatus = "//td[@icna = 'ReferralStatus']";
export const btn_Clinicok ="//td[@title='OK']";
export const img_ExternalLink = "//img[@title ='External Link']"
export const btn_Encounter = "//button[@title ='encounter']"
export const img_ExternalLinkHeader = "//td[@id = 'tdDIHeader']/img[@title = 'External Links']"
export const img_DIDetachWindow = "//td[@id = 'tdDIExternal']/img[@title = 'Detach window']"

//Additional Options - Lorenzo
export const lnkSubTaskPaneCaseloadmanagement = "//span[text()='Caseload management']";

//Caseload management
export const chk_profile = "(//img[@class='Tree_B0AM'])[6]";
export const btn_OK = "//button[@title='OK']";
export const lnkSubTaskPaneAllocatetocaseload = "//span[@class='T_PL' and normalize-space()='Allocate to caseload']";
export const lnkSubTaskPaneModifycaseloadentry = "//span[contains(@class,'T_PL') and normalize-space()='Modify caseload entry']";
export const chk_Mycaseload = "//tr[@data-uid]//input[@type='checkbox' and contains(@class,'k-select-checkbox')]";
export const lnkSubTaskPaneSuspendcaseloadentry = "//span[@class='T_PL' and normalize-space()='Suspend caseload entry']";
export const lnkSubTaskPaneResumecaseloadentry = "//span[@class='T_PL' and normalize-space()='Resume caseload entry']";
export const lnkSubTaskPaneClosecaseloadentry = "//span[@class='T_PL' and normalize-space()='Close caseload entry']";
export const tab_Historyview = "//nobr[normalize-space()='History view']";
export const tbl_Selectrowclose = "//td[@title='Click to select row' and contains(@class,'G_DRO')]";
export const lnkSubTaskPaneReinstatecaseloadentry = "//span[normalize-space()='Reinstate caseload entry']";
export const lnkSubTaskPaneManagecaseloadentry = "//span[normalize-space()='Manage caseload transfer']";
export const lnkSubTaskPaneInTray = "//span[normalize-space()='In-tray']";
export const lbl_Mycaseload = "//td[@id='pht_SlPMyCaseLoad']";
export const ico_HO = "//img[contains(@id,'ImgPlusORMinusHO490000017354_child')]";
export const ico_Mycaseload = "//img[contains(@id,'C0_ImgPlusORMinusMYCLPRF_child')]"
export const btn_PerformTask ="//button[@id='btnPerformTask']";
export const cmb_Transferaction = "//input[@id='icombobox_Text_C33']";
export const  btn_Update = "//td[@title='Click here to update']";
export const ico_intraycaseload = "//div[text() = 'Caseload']";
