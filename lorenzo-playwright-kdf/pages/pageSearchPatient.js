// pageSearchPatient
export const txt_Identifier = "//input[@title='Enter an identifier']";
// Patient search after clicking 'Find record' (lnkTaskPanePatient) loads the
// patientbasicsearch.aspx (VW_PTSRC) view, whose surname field is itxtSurname.
export const txt_Surname = "//input[@dikey='itxtSurname']";
// Find button in the Find-record patient search form (Lorenzo command cell, text 'Find',
// verified live). NOT //button[@title='Click to Find'] (that button has no title here).
// Exact 'Find' text avoids matching 'Find external'.
export const btn_Find = "//td[@class='Cmd_TTE' and normalize-space()='Find']";
export const ico_Gender = "//img[@title='Enter a gender value']";
export const cmb_Gender = "//label[text()='Gender']";
export const lbl_Gender = "//input[@title='Enter a gender value']";
export const txt_DOB = "//input[@class='DP_TB_Text']";
export const txt_Title = "//input[@title='Select title']";
export const txt_Middlename = "//input[@title='Enter Middle Name']";
