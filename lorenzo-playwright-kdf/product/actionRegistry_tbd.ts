// import * as ElementActions from "./elementActions";
// import * as BrowserActions from "./browserActions";
// import * as DataActions from "./dataActions";
// import * as LorenzoActions from "./lorenzoActions";
// import * as WaitActions from "./waitActions";
// import { getCurrentDateTime, getFutureDateTime, getPastDateTime } from "../utilities/dateUtilities";
// import * as AssertActions from "./assertActions";
// export function getActionKeyword(keyword: string): Function | undefined {
//   switch (keyword.toLowerCase()) {
//     // Element Actions
//     case 'waitforelement':
//       return ElementActions.waitForElement;
//     case 'clickelement':
//       return ElementActions.clickElement;
//     case 'dblclickelement':
//       return ElementActions.dblClickElement;
//     case 'rclickelement':
//       return ElementActions.rClickElement;
//     case 'settextbox':
//       return ElementActions.setTextBox;
//     case 'gettext':
//       return ElementActions.getText;
//     case 'selectlistbox':
//       return ElementActions.selectListBox;
//     case 'verifyvalueinlistbox':
//       return ElementActions.verifyValueInListBox;
//     case 'sendkeys':
//       return ElementActions.sendKeys;
//     case 'verifyrecordintable':
//       return ElementActions.verifyRecordInTable;
//     case 'getattribute':
//       return ElementActions.getAttribute;
//     case 'selectrecordintable':
//       return ElementActions.selectRecordInTable;
//     case 'selectippegboardemptyrow':
//       return ElementActions.selectIPPegBoardEmptyRow;
//     case 'handledialog':
//       return ElementActions.handleDialog;





//     // Browser Actions
//     case 'launchurl':
//       return BrowserActions.launchUrl;
//     case 'selecttab':
//       return BrowserActions.selectTab;
//     case 'closebrowsertab':
//       return BrowserActions.closeBrowserTab;

//     // Data Actions
//     case 'setvariable':
//       return DataActions.setVariable;
//     case 'getrandomvalue':
//       return DataActions.getRandomValue;
//     case 'startcapturingnetworkdata':
//       return DataActions.startCapturingNetworkData;
//     case 'stopcapturingnetworkdata':
//       return DataActions.stopCapturingNetworkData;
//     case 'parsenetworkjsondata':
//       return DataActions.parseNetworkJsonData;
//     case 'postapiquery':
//       return DataActions.postAPIQuery;

//     // Wait Actions
//     case 'waitforroller':
//       return WaitActions.waitForRoller;
//     case 'waitforseconds':
//       return WaitActions.waitForSeconds;

//     // Lorenzo Actions
//     case 'setcheckbox':
//       return LorenzoActions.setCheckbox;
//     case 'selectcombobox':
//       return LorenzoActions.selectComboBox;
//     case 'setcombobox':
//       return LorenzoActions.setComboBox;
//     case 'verifyvalueincombobox':
//       return LorenzoActions.verifyValueInComboBox;
//     case 'toggleelement':
//       return LorenzoActions.toggleElement;
//     case 'login':
//       return LorenzoActions.login;
//     case 'searchpatient_upatientsearch':
//       return LorenzoActions.searchPatient_UPatientSearch;
//     case 'selectrecordinugridtable':
//       return LorenzoActions.selectRecordInUGridTable;
//     case 'searchandselectupatient':
//       return LorenzoActions.searchAndSelectUPatient;
//     case 'verifyrecordinugridtable':
//       return LorenzoActions.verifyRecordInUGridTable;
//     case 'selecttypeahead':
//       return LorenzoActions.selectTypeAhead;
//     case 'cleartextbox':
//       return LorenzoActions.clearTextBox;
//     case 'mousehoverandgettext':
//       return LorenzoActions.mouseHoverAndGetText;
//     case 'creategeneralprescription':
//       return LorenzoActions.createGeneralPrescription;
//     case 'logout':
//       return LorenzoActions.logout;
//     case 'verifyascendingsortugrid':
//       return LorenzoActions.verifyAscendingSortUGrid;
//     case 'verifydescendingsortugrid':
//       return LorenzoActions.verifyDescendingSortUGrid;
//     case 'verifycomboboxoptions':
//       return LorenzoActions.verifyComboBoxOptions;
//     case 'gettextandstorepasid':
//       return LorenzoActions.getTextAndStorePASID;
//     case 'settextpasid':
//       return LorenzoActions.setTextPASID;
//     case 'getcelldata':
//       return LorenzoActions.getCellData;
//     case 'selectcombobyindex':
//       return LorenzoActions.selectComboByIndex;
//     case 'selectippegboardbyheader':
//       return LorenzoActions.selectIPPegBoardByHeader;
//     case 'selectecpatbyheader':
//       return LorenzoActions.selectECPatByHeader;
//     case 'splitstring':
//       return LorenzoActions.splitString;
//       case 'settextboxion':
//       return LorenzoActions.setTextBoxIon;
//       case 'settextboxkendo':
//       return LorenzoActions.setTextBoxKendo;
//       case 'selectdruginmultilist':
//       return LorenzoActions.selectDrugInMultiList;
//       case 'selectkendocombobox':
//       return LorenzoActions.selectKendoComboBox;  


  



//     // Date Utilities
//     case 'getcurrentdatetime':
//       return getCurrentDateTime;
//     case 'getfuturedatetime':
//       return getFutureDateTime;
//     case 'getpastdatetime':
//       return getPastDateTime;

//     // Assert Actions
//     case 'verifyproperty':
//       return AssertActions.verifyProperty;
//     case 'verifystyle':
//       return AssertActions.verifyStyle;
//     case 'verifydatahighlight':
//       return AssertActions.verifyDataHighlight;
//     case 'asserttextcontains':
//       return AssertActions.assertTextContains;
//     case 'asserttextequals':
//       return AssertActions.assertTextEquals;

//     default:
//       return undefined;
//   }
// }
