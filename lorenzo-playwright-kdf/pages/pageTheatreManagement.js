// pageTheatreManagement
export const txt_SessionStatusdefaultPlanned = "//div[@title='Planned']";
export const txt_SessionStatus = "//ion-label[contains(.,'<variable>')]/parent::ion-item/ion-checkbox";
export const btn_OKSessionStatus = "//ion-button[contains(.,'Ok')]";
export const lbl_TheatreSuite = "//ion-label[contains(.,'Theatre suite')]/ancestor::ion-card-header/following-sibling::ion-card-content/ion-item";
export const txt_TheatreSuite = "//ion-label[normalize-space()='<variable>']/ancestor::ion-item[1]/ion-radio";
export const btn_Cancel = "//ion-button[normalize-space()='Cancel']";
export const btn_Find = "//ion-button[normalize-space()='Find']";
export const btn_Clear = "//ion-button[normalize-space()='Clear']";
export const icn_Theatresession = "//tr[@class='k-master-row k-table-row']//span[@title='Ends every day session']";
//export const tbl_Hubicon = "(//div[@title='<variable>']/ancestor::tr[@kendogridlogicalrow]/td/div[@part='calenderIcon'])[1]";
export const tbl_Currentstatus ="//div[@title='<variable>']/ancestor::tr[@kendogridlogicalrow]//div[contains(@class,'currentstatus')]";
export const btn_NOW = "//ion-button[contains(@class,'now-btn')][.//text()[normalize-space()='NOW']]";
export const lbl_TheatreSessionTABName = "//ion-segment-button//ion-label[normalize-space()='<variable>']/ancestor::ion-segment-button";
//export const btn_NOW2 = "//ion-button[normalize-space()='NOW']";
//export const btn_OPStartedNOW = "//ion-label[normalize-space()='started']/ancestor::ion-card-header/following-sibling::ion-card-content//ion-button[normalize-space()='NOW']";
//export const btn_OPEndNOW = "//ion-label[normalize-space()='end']/ancestor::ion-card-header/following-sibling::ion-card-content//ion-button[normalize-space()='NOW']";
export const btn_OPStartedNOW = "//ion-button[normalize-space()='NOW']";
export const txt_RecoveryWarning = "//ion-label[normalize-space()='warning']/ancestor::ion-card-header/following-sibling::ion-card-content//ion-input";
export const btn_Close = "//ion-button[normalize-space()='Close']";
export const txt_Reason = "//ion-label[normalize-space()='<variable>']/ancestor::ion-item[1]/ion-radio";
// DUPLICATE of btn_ReasonOK/btn_OkManagedelay (superseded by the generic-text definitions later in file) — commented.
// export const btn_ReasonOK = "//ion-button[contains(@class,'save-button manage_ops_save ')]";
// export const btn_OkManagedelay = "//ion-button[contains(@class,'ok-btn')]";
export const icn_Anaesthsia = '//body//app-root//ion-segment-button[2]';
export const icn_Operation = "//ion-segment-button[.//ion-label[normalize-space()='Operation']]";
export const btn_Menuicon = "//ion-button[@id='hub-menu']";
export const lnk_Manageoperation = "//ion-label[text()='Manage operation']";
export const btn_Addprocedure = "//ion-button[normalize-space(.)='Add procedure']";
//export const txt_searchprocedure = "(//ion-input[contains(@class,'input-wrap')])[6]";
export const txt_searchprocedure = "(//input[contains(@class,'native-input')])[6]";
export const btn_TextArea = "(//ion-input[contains(@class,'input-wrap')]//input)[6]";
export const btn_Searchprocedure = "//ion-button[normalize-space()='Search']";
export const rad_procedureselect = "//ion-radio[contains(@class,'radiobtn md in-item radio-justify-space-between')]";
export const txt_Selectprocedure = "//ion-label[contains(@class,'radio-label')]";
export const btn_okprocedure = "//ion-button[contains(@class, 'ok-btn') and contains(., 'Ok')]";
export const btn_Starttime = "//ion-button[contains(@class,'save-button') and contains(., 'OK')]";
export const btn_Okperformedby = "//ion-button[contains(@class,'save-button') and normalize-space(.)='OK']";
export const btn_Team = "//div[contains(@class, 'radio-icon')]";
export const btn_OKTeam = "//ion-button[@class='save-button manage_ops_save md button button-small button-solid ion-activatable ion-focusable hydrated']";
export const btn_Ok_Manageoperation = "//ion-button[normalize-space(text())='OK']";
export const txt_Starttime = "//input[contains(@class,'native-input') and @type='tel'][1]";
export const txt_Endtime = "//input[contains(@class,'native-input') and @type='tel'][2]";
export const btn_copytime = "//ion-button[contains(., 'Copy times to procedure')]";
export const txt_performedby = "//td[@data-kendo-grid-column-index='7']";
export const btn_performedby = "//div[contains(@class, 'radio-icon')]";
export const icn_Recovery = "//ion-segment-button[.//ion-label[normalize-space()='Recovery']]";
export const icn_Departure = "//ion-segment-button[.//ion-label[normalize-space()='Departure']]";
export const rad_Reason = "//ion-item[.//ion-label[normalize-space()='Nursing team delay']]//input";
export const btn_OKMC = "//ion-button[normalize-space()='OK']";
export const lbl_Comments = "//td[@role='gridcell' and @data-kendo-grid-column-index='4' and @aria-selected='true']";
export const txt_Commentstxt = "//textarea[@id='ion-textarea-3']";
export const btn_TheatreClose = "//ion-button[normalize-space()='Close']";
export const tbl_TheatreExpand = "//kendo-grid[@id='shrink']";
export const lnk_Theatreeventoverview = "//ion-label[.//span[normalize-space()='Theatre event overview']]";
export const txt_Actualstarttime = "//ion-col[normalize-space()='24/03/2026 07:45']";
export const txt_Actualendtime = "//ion-col[normalize-space()='25/03/2026 11:33']";
export const tab_Operation = "//ion-segment-button[@title='Operation']";
export const txt_verifyprocedure = "//div[normalize-space()='Ablation of inner ear by cryosurgery']";
export const btn_Logouttheatre = "//ion-button[@title='Log out']";
export const btn_Logoutbutton = "//ion-item[normalize-space()='Log out']";
export const btn_Logout = "//img[@title='Exit']";
export const txt_Yes = "//td[@title='Yes']";
export const lnk_Session ='(//td[contains(@class,"Sessiontype")]//ion-icon[@name="timer-outline"])[2]';
//export const lnk_Sessionold = "//span[@title='Runs over night session starting before the search date']";
//export const lnk_Theatre_Booked = '//tr[.//div[normalize-space()="Booked"]][.//div[@title="_BannerPASIDUpper"]]//ion-icon[@name="calendar"]';
//export const lnk_Theatre_Booked = `//tr[.//div[normalize-space()='Booked']][.//div[text()='${_BannerPASIDUpper}']]//ion-icon[@name='calendar']`;
//export const lnk_Theatre_Booked = `//tr[.//div[normalize-space()='Booked']][.//div[@title='<variable>']]//ion-icon[@name='calendar']`;
export const lnk_Theatre_Booked = "//div[@class='smallfont2' and text()='" + _BannerPASIDUpper + "']/ancestor::tr";
export const btn_OKevent ="//ion-button[normalize-space()='OK']";
export const icn_manageoutcome = "(//ion-radio-group//ion-item//ion-radio)[3]";
export const btn_OKmanageoutcome = "//ion-button[normalize-space()='OK']"
export const lbl_Eventoutcome = "//ion-label[normalize-space()='Event outcome']"
export const txt_Clicktext ="//ion-label[contains(normalize-space(),'Planned time')]";
export const tbl_Hubicon = "//th[.//div[@title='Hub']]";
export const btn_THCancel = "//ion-button[contains(@class,'save-button manage_ops_cancel md button button-small button-solid')]";
export const rad_THRadioselect = "//ion-radio[contains(@class,'md in-item radio-justify-space-between radio-alignment-center radio-label-placement')]";
export const btn_THOK = "//ion-button[contains(@class,'save-button manage_ops_save md button button-small button-solid')]";
export const btn_THCopyTime = "//ion-button[contains(@class,'managetParentBtn height30 LowerSet md button button-solid ion-activatable')]";
export const lbl_CODE = "//ion-chip[normalize-space()='CODE']"
export const btn_THClose = "(//ion-button[contains(@class,'md button button-solid ion-activatable ion-focusable hydrated')])[1]";
export const txt_THVerifystatus = "//div[contains(@class,'currentstatus')]";
export const txt_Procedure1 = "(//td[@class='k-table-td k-touch-action-auto'])[9]";
export const txt_Procedure2 = "(//td[@class='k-table-td k-touch-action-auto'])[15]";
export const btn_ReasonOK = "//ion-button[contains(.,'OK')]";
export const btn_OkManagedelay = "//ion-button[contains(.,'Ok')]";
export const btn_managedelay = "(//ion-radio[contains(@class,'radio-justify-space-between')])[1]";
export const btn_managedelay1 = "(//ion-radio[contains(@class,'radio-justify-space-between')])[3]";
export const btn_ManageReasonOK1 = "//ion-button[contains(@class, 'save-button') and contains(@class, 'manage_ops_save')]";









