// pageRegRegistration
export const txt_Surname = "//input[@dikey='itxtSurname']";
export const txt_Forename = "//input[@dikey='itxtForename']";
export const txt_City = "//input[@title='Enter City']";
export const cmb_Country = "//input[@title='Enter Country']";
// DUPLICATE of btn_Finishnow — superseded by the title-ancestor definition later in file; commented.
// export const btn_Finishnow = "//table//td[@title='Finish now']";
export const ico_RegRoadmapTitle = "//td[@class='Cmd_TTE'][@title='Yes']";
export const lnk_Postalcode = "//img[@title='Please enter Select address type']";
export const txt_Pincode = "//input[@dikey='iPostCode']";
export const btn_Find = "//img[@title='Use this to select via address finder']";
export const tbl_SelectRow = "(//table[contains(@id,'igrdSearch')]//tr[contains(@id,'igRow')][1]/td[1] | //table[contains(@id,'Search')]//tr[contains(@id,'igRow')][1]/td[1] | //tr[contains(@id,'igRow')][1]/td[1])[1]";
// Address SFS finder dialog (opens on Next -> "Please validate the address" -> Ok).
// Criteria fields map to itxtFld1..itxtFld6 in the dialog frame.
export const txt_AddrPremises = "//input[@dikey='itxtFld1']";
export const txt_AddrStreet = "//input[@dikey='itxtFld2']";
export const txt_AddrLocality = "//input[@dikey='itxtFld3']";
export const txt_AddrCity = "//input[@dikey='itxtFld4']";
export const txt_AddrCounty = "//input[@dikey='itxtFld5']";
export const txt_AddrPostcode = "//input[@dikey='itxtFld6']";
export const btn_AddrFind = "(//button[@title='Find'] | //img[@title='Find'] | //td[normalize-space(.)='Find'])[1]";
export const btn_AddrClear = "(//button[@title='Clear'] | //img[@title='Clear'] | //td[normalize-space(.)='Clear'])[1]";
// Finder Cancel: the SFS dialog's command-bar cells are Cmd_TTE with EMPTY title and the label
// as text (Ok/Cancel/Find/Clear). The app-bar Cancel, in contrast, has title='Cancel'. So anchor
// the finder Cancel to the finder Ok BY TEXT (app-bar has no "Ok"), never the bottom app-bar Cancel.
export const btn_AddrCancel = "(//td[normalize-space(.)='Ok']/ancestor::table[1]//td[normalize-space(.)='Cancel'] | //td[normalize-space(.)='Ok']/following::td[normalize-space(.)='Cancel'][1])[1]";
export const btn_AddrOk = "(//td[@title='Ok'] | //td[normalize-space(.)='Ok'] | //img[@title='Ok'])[1]";
export const txt_TelephoneHome = "//input[@title='Enter Telephone (home)']";
export const txt_TelephoneMobile = "//input[@title='Enter Telephone (mobile)']";
export const txt_TelephoneWork = "//input[@title='Enter Telephone (work)']";
export const txt_TelephoneEmail = "//input[@id='it_ThInput_C67' and @title='Enter Email address']";
export const btn_Next = "//td[@title='Next']";
export const cmb_PreferenceType = "//input[@title='Select Preference Type']";
export const btn_AddPreference = "//td[@title='Add preference to grid']";
export const cmb_CountryofBirth = "//input[@title='Select Country of Birth']";
export const txt_PlaceOfBirth_ = "//input[@title='Enter a free text value for the place of birth']";
export const cmb_Nationality = "//input[@title='Select Nationality']";
export const cmb_Religion = "//input[@title='Select Religion']";
export const cmb_SexualOrientation = "//input[@title='Select Sexual orientation']";
export const cmb_SelectEthnicity = "//input[@title='Select Ethnicity']";
export const txt_RelSurname = "//input[@dikey='itxtSurname']";
export const cmb_Relationship = "//input[@title='Select Relationship']";
export const btn_Relrolegreen = "//input[@title='Select relationship role']";
export const btn_Add = "//td[@title='Add preference to grid']";
export const btn_RelAdd = "//tr[@class='Cmd_VAM']//td[@title='Add'][contains(., 'Add')]";
export const cmb_SelectCareproviderType = "//input[@title='Select care provider type']";
export const btn_ClickSelectCareprovider = "//input[@title='Click to select a care provider']";
export const txt_Identifier = "//input[@title='Enter the identifier']";
export const btn_FindNow = "//td[@title='Click to execute the selected search criteria']";
export const btn_OkCP = "//td[@title='Click to add the selected care providers(s)']";
export const btn_OK = "(//td[@title='Ok'] | //td[@title='OK'] | //button[@title='OK'] | //button[@title='Ok'] | //td[normalize-space()='Ok'] | //td[normalize-space()='OK'])[1]";
export const btn_Finish = "//td[@title='Finish']";
// DUPLICATE (superseded by definitions later in file) — commented.
// export const cmb_PrimaryContact = "//input[@title='Select Primary Contact type']";
// export const lnk_Registrationtemporary = "//span[normalize-space()='Registration - temporary']";
export const txt_Title = "//input[@title='Select title']";
export const txt_Middlename = "//input[@title='Enter Middle Name']";
export const btn_Relrolegreendrop = "//div[contains(@onclick, '('C28','DropOnClick')'')]";
export const img_RelationshipRole = "//img[contains(@id, 'C28')][@class='CycleBox_DropListImg_Li'])[2]";
export const icn_SelectGP = "(//img[@title='Click to select a care provider'])";
export const txt_IDCP = "//input[@title='Enter the identifier']";
export const btn_FindNowCP = "//td[@title='Click to execute the selected search criteria']";
export const btn_OKCP = "//td[normalize-space(.)='Ok']";
export const btn_AddCPgrid = "//td[normalize-space()='Add']";
export const txt_CPTeam = "//input[@accesskey='Y'][@title='Select a Care provider team']";
// DUPLICATE of btn_Cancel — superseded by the iShowMessage definition later in file; commented.
// export const btn_Cancel = "//td[@class='msgboxbtnparentdiv']//td[@title='Cancel']";
export const btn_Finishnow = "//title[contains(text(),'Registration - LORENZO')]/ancestor::html//td[@title='Finish now']";
export const cmb_PrimaryContact = "//img[@title='Select Primary Contact type']";
export const lnk_Registrationtemporary = "//span[text()='Registration - temporary']";
export const btn_Cancel = "(//form[@name='iShowMessage']//td[@title='Cancel'] | //td[@title='Cancel'] | //button[@title='Cancel'] | //td[normalize-space()='Cancel'])[1]";
