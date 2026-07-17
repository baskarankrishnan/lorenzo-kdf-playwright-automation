import * as ElementActions from "../core/actionkeywords/elementActions";
import * as BrowserActions from "../core/actionkeywords/browserActions";
import * as DataActions from "../core/actionkeywords/dataActions";
import * as AssertActions from "../core/actionkeywords/assertActions";
import * as LZOActions from "./lorenzoActions";

export function getActionKeywordFunction(actionKeyword: string): Function | undefined {
    switch (actionKeyword.toLowerCase()) {

        // PRODUCT ACTIONS
        case 'launchurl':
            return LZOActions.launchUrl;
        case 'login':
            return LZOActions.login;
        case 'selectmenu':
            return LZOActions.selectMenu;
        case 'handledialog':
            return LZOActions.handleDialog;
        case 'selectcontextmenu':
            return LZOActions.selectContextMenu;
        case 'selectsfs':
            return LZOActions.selectSFS;
        case 'selecttab':
            return LZOActions.selectTab;
        case 'getcelldata':
            return LZOActions.getCellData;
        case 'clickcelldata':
            return LZOActions.clickCellData;
        case 'swapformitemposition':
            return LZOActions.swapFormItemPosition;
        case 'draganddropelement':
            return LZOActions.dragAndDropElement;
        case 'selectrecordintable':
            return LZOActions.selectRecordInTable;
        case 'selectcompositelistbox':
            return LZOActions.selectCompositeListbox;
        // case 'clickbodypart':
        //     return LZOActions.clickBodyPart;
        case 'verifybodyimagepart':
            return LZOActions.verifyBodyImagePart;
        case 'selectcombobox':
            return LZOActions.selectComboBox;
        case 'gettextandstorepasid':
            return LZOActions.getTextAndStorePASID;
        case 'splitstring':
            return LZOActions.splitString;
            case 'selectippegboardbyheader':
            return LZOActions.selectIPPegBoardByHeader;
            

        // ELEMENT ACTIONS
        case 'selecttablerowbypasidusingstructure':
            return ElementActions.selectTableRowByPasIdUsingStructure;
        case 'selecttablerowbyvalue':
            return ElementActions.selectTableRowByValue;
        case 'waitforelement':
            return ElementActions.waitForElement;
        case 'clickelement':
            return ElementActions.clickElement;
        case 'settextbox':
            return ElementActions.setTextBox;
        case 'gettext':
            return ElementActions.getText;
        case 'selectlistbox':
            return ElementActions.selectListBox;
        case 'verifyvalueinlistbox':
            return ElementActions.verifyValueInListBox;
        case 'sendkeys':
            return ElementActions.sendKeys;
        case 'mousehover':
            return ElementActions.mouseHover;
        case 'dblclickelement':
            return ElementActions.dblClickElement;
        case 'rclickelement':
            return ElementActions.rClickElement;
        case 'verifyrecordintable':
            return LZOActions.verifyRecordInTable;
        case 'clickandhandlealert':
            return ElementActions.clickAndHandleAlert;
        case 'setcombobox':
            return ElementActions.setComboBox;
        case 'sleep':
            return ElementActions.sleep;
        case 'jsclickbytext':
            return ElementActions.jsclickByText;
        case 'setautocompletefield':
            return ElementActions.setAutoCompleteField;    
        case 'clicktab':
            return ElementActions.clickTab;
        case 'selecttablerowbyintray':
            return ElementActions.selectTableRowByIntray;    

        // ASSERTION ACTIONS
        case 'verifyproperty':
            return AssertActions.verifyProperty;
        case 'verifystyle':
            return AssertActions.verifyStyle;
        case 'asserttextcontains':
            return AssertActions.assertTextContains;
        case 'asserttextequals':
            return AssertActions.assertTextEquals;

        // DATA ACTIONS
        case 'setvariable':
            return DataActions.setVariable;
        case 'getcurrentdatetime':
            return DataActions.getCurrentDateTime;
        case 'getpastdatetime':
            return DataActions.getPastDateTime;
        case 'getfuturedatetime':
            return DataActions.getFutureDateTime;
        case 'getuniquevalue':
            return DataActions.getUniqueValue;
        case 'tolowercase':
            return DataActions.toLowerCase;
        case 'touppercase':
            return DataActions.toUpperCase;
        case 'trim':
            return DataActions.trim;
        case 'concat':
            return DataActions.concatenate;
        case 'getsubstring':
            return DataActions.getSubString;
        case 'callcommonscripts':
            return DataActions.callCommonScripts;
        case 'getrandomvalue':
            return DataActions.getRandomValue;



        // BROWSER ACTIONS
        case 'waitforroller':
            return BrowserActions.waitForRoller;
        case 'waitforseconds':
            return BrowserActions.waitForSeconds;
        case 'closebrowsertab':
            return BrowserActions.closeBrowserTab;
        case 'refreshcurrentpage':
            return BrowserActions.refreshCurrentPage;
        case 'maximizebrowser':
            return BrowserActions.maximizeBrowser;


        default:
            return undefined;
    }
}
