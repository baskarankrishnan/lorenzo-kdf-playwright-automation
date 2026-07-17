// pageMedicationadministrationchart
export const txt_Duenow = "//input[@role='spinbutton' and @aria-valuenow='500']";
export const txt_Dose = "(//input[@role='spinbutton' and @class='k-input-inner'])[1]";
export const txt_Route = "//label[normalize-space()='Given']/preceding::input[@type='radio'][1]";
export const chk_Witnessby = "//input[@type='checkbox' and @command='BtnObservationClick']";
export const btn_OK = "//button[normalize-space()='Ok']";
export const lnk_Modify = "//button[normalize-space()='Modify']";
export const txt_RouteNotgiven = "//label[normalize-space()='Not given']/preceding::input[@type='radio'][1]";
export const cmb_Amendreason = "//icombobox[@name='cboAmendReason']//span[@class='k-button-icon k-icon k-i-arrow-s']";
export const cmb_Notgivenreason = "//icombobox[@name='cboResNotGiven']//span[@class='k-button-icon k-icon k-i-arrow-s']";
export const icn_Notgiven = "//img[contains(@src,'idrugnotadministerednor16.png') and @kendotooltip]";
export const lnk_Overview = "//span[@title='Overview']";
export const lnk_Strikethrough = "//button[normalize-space()='Strikethrough']";
export const cmb_ReasonStrikethrough = "//input[@role='combobox']/following::span[contains(@class,'k-i-arrow-s')][1]";
export const btn_Finish = "//span[normalize-space()='Finish']";
export const tbl_Columnnameold ="//table[@class='TDHet1 TDOvHid TdWid1']";
export const tbl_Columnname = "//span[contains(@class, 'colAlignMedicationChart')]";
export const txt_Duenow1 = "(//span[contains(@class, 'ng-star-inserted') and normalize-space()='Due now'])[1]";
export const chk_NoWitnessAvailable = "//input[@value='No witness available']";
export const tbl_Medchart = "//kendo-gridlayout-item[descendant::kendo-grid[@id='medication']]";
export const icn_Drugadministered = "//img[contains(@src,'idrugadministerednor16.png')]"
export const icn_Prescriptionchart = "//th[@aria-colindex='4']//span[contains(@class, 'colAlignPrescriptionChart')]"
