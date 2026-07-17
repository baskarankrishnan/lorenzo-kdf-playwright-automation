// PagePrescriptionchart
export const icn_Tablet = "(//img[@kendotooltip and @ng-reflect-show-on='hover'])[27]";
export const lnk_Omit = "//button[normalize-space()='Omit']";
export const lnk_Clear = "//button[normalize-space()='Clear selection']";
export const chk_Omitslot = "//input[@type='radio' and @title='Tick to omit selected slots']";
export const txt_CommnetsOmit = "//textarea[contains(@class,'k-input-inner') and @aria-multiline='true']";
export const btn_OK = "//button[normalize-space()='Ok']";
export const icn_History = "//img[contains(@src,'ihistorynor16.png')]";
export const btn_Close = "//button[normalize-space()='Close']";
export const btn_Finish = "//span[normalize-space()='Finish']";
export const icn_Omit = "(//img[@src='assets/images/slot status-omitted.png'])[2]";
export const icn_Omitentered = "(//img[@src='assets/images/slot status-omitted.png'])[2]";
export const icn_OmitForDrug = (drugName, dateText) =>
  `//tr[contains(normalize-space(.), "${drugName}") and contains(normalize-space(.), "${dateText}")]//img[@src='assets/images/slot status-omitted.png']`;
export const lnk_Reinstate = "//button[normalize-space()='Reinstate']";
export const txt_Reinstatereason = "//textarea[contains(@class,'k-input-inner')]";
export const chk_Indefinite = "//input[@type='radio' and @ng-reflect-value='Indefinite']";
export const txt_Reviewperiod = "//input[@role='spinbutton' and @title='Provide a review period']";
export const img_SodiumBicarbonate = "//tr[contains(normalize-space(),'sodium bicarbonate')]//image[@name='Child?.Name']";