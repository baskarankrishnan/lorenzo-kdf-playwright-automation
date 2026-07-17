// pageFindandbook
export const btn_PopUpTitle = "//dialog[@id='dialog_1']//p[@id='DlgTitle']";
export const btn_Cancel = "//form[@name='iShowMessage']//td[@title='Cancel']";
export const btn_PopUpYes = "//button[@title='Yes']";
export const btn_PopUpNo = "//td[@title='No']";
export const btn_Finishnow = "//h1[contains(text(),'Referral details')]/ancestor::table//tr[contains(@class,'TRSty3')]//button[@id='ic_C_C9']";
export const btn_BookFinishnow = "//td[@title='Finish now']"
export const lbl_PatientBookBanner = "(//td[@class='CxtBar_TD6'])[1]";
export const btn_Clear = "//td[@title='Clear']";
export const cmb_WardName = "//input[@title='Specify the Ward name for the bed space booking']";
export const icn_CheckAvailability = "//button[.//td[normalize-space()='Check availability']]";
export const lnk_Bookslot = "(//input[@aria-label='Select row'])[4]";
export const btn_Next = "//td[@title='Next']";
export const txt_Identifier = "//input[@id='it_C_itxtID' and @title='Enter the identifier']";
export const btn_Find = "//td[@class='Cmd_TTE' and @title='Click to execute the selected search criteria']";
export const btn_Ok = "//img[@id='ic_I_C7' and @title='Click to add the selected care providers(s)']";
export const icn_SFS = "//img[contains(@title,'Select a care provider')]";
export const ico_CareProviderSFS = "//img[@tooltip='Please select the required care provider']";
export const lnk_CreateReferral = "//button[contains(@title, 'create a referral')]";
export const cmb_Visittype = "//input[@title='Please select the Visit type']";
// DUPLICATE of btn_Finish — superseded by the @title definition later in file; commented.
// export const btn_Finish = "//td[normalize-space()='Finish']";
export const ico_SelectReferral = "//img[@title='Please select the appropriate Referral ']";
export const btn_Select = "//td[text()='Select']";
export const lbl_Warning = "//p[text()='Warning - LORENZO']";
export const btn_Yes = "//td[normalize-space()='Yes']";
export const dte_ReferralAcceptedDateTime = "//tr[@id='trMngReferralDate']//input[@type='text']";
export const btn_Finish = "//td[@title='Finish']";
export const btn_BookFinish = "//h1[contains(text(),'Manage referral')]/ancestor::table//tr[contains(@class,'TRSty3')]//button[@id='ic_C_C11']";