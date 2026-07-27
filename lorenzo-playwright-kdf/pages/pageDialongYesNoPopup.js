// pageDialongYesNoPopup
export const ico_HeadingInfo = "//p['Information - LORENZO']";
export const ico_DocHeadingInfo = "//p['Select document templates - LORENZO']";
// Robust No button: the "Question - LORENZO" (PDS Retrieve/Trace timeout) dialog renders No as
// <img id='ic_I_C1' title='No'>; NHS popups use a <td title='No'>. NO trailing [1] predicate:
// resolveElement's multi-match logic inspects visibility/z-index/modal to pick the visible one,
// which a single-node [1] in document order would bypass (and could select a hidden td).
export const btn_PopUpNo = "//img[@title='No'] | //td[@title='No']";
export const ico_Heading = "//p['Information - LORENZO']";
export const btn_PopUpYes = "//td[@class='Cmd_TTE'][@title='Yes']";
// "Select document templates - LORENZO" dialog Cancel. Its command-bar cells are Cmd_TTE with the
// label as text; anchor the Cancel to the dialog's Ok (the only visible dialog with an Ok here).
// "PopUp" in the name enables framework soft-fail auto-detection if the dialog does not appear.
export const btn_PopUpDocCancel = "(//td[normalize-space(.)='Ok']/ancestor::table[1]//td[normalize-space(.)='Cancel'] | //td[normalize-space(.)='Ok']/following::td[normalize-space(.)='Cancel'][1])[1]";


