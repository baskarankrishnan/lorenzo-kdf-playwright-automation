import { title } from "process";

export interface PageDefinition {
    url?: string | string[];
    title?: string | string[];
    elementTimeout?: number;  // override element search timeout (ms); default 30000
}

export const PAGE_REGISTRY: Record<string, PageDefinition> = {
    'LoginPage': {
        url: '/webclient_sso/ssoredirect',
        title: 'ID Portal Login'
    },
    'pageLogin': {
        url: ['/webclient_sso/extlogon', '/OIDCPortal/authorize', '/webclient_sso/ssoredirect'],
        title: ['ID Portal Login', 'Login']
    },
    'pageHome': {
        url: '/EPR/APPMAINPAGE',
        title: 'LORENZO'
    },
    
     'pageMngRelationShips': {
    url: '/EPR/AppDialog.aspx?TITLE=Manage%20relationships%20',
    title: 'Manage relationships - LORENZO'
    },

        'pageCreateAdmit': {
        url: 'webclient_sso/EPR/AppTransfer',
        title: 'Create Admit - LORENZO',
        },

       // 'pageCreateReferral': {
        //url: 'WebClient_SSO/identity%20management/wzforms/patientsearch',
        //title: 'ReferralDetails',
        //},
        'pageFindandbook': {
        url: 'AppDialog.aspx?TITLE=Find%20and%20book',
        title: 'Find and book - LORENZO',
        },
        'pagePatientSearch': {
         url: 'AppDialog.aspx?TITLE=Find%20and%20book',
         title: 'Find and book - LORENZO',
        },
        'pagePatientBasicSearch': {
        url: 'AppDialog.aspx?TITLE=Find%20and%20book',
        title: 'Find and book - LORENZO',
        },
        'pageIPSMBasicSearchCriteria': {
        url: 'AppDialog.aspx?TITLE=Find%20and%20book',
        title: 'Find and book - LORENZO',
        },
        'pageBookBanner': {
        url: 'webclient_sso/EPR/AppContextBanner',
        title: 'AppContextBanner',
        },
        'pageBookWardappointment': {
        url: 'AppDialog.aspx?TITLE=Find%20and%20book',
        title: 'Find and book - LORENZO',
        },
        'pageReferralDetails': {
        url: ['AppDialog.aspx?TITLE=Find%20and%20book', 'AppDialog.aspx?TITLE=Create%20referral%20'],
        title: ['Find and book - LORENZO', 'Create referral - LORENZO'],
        },
        'pageManageReferral': {
        url: 'AppDialog.aspx?TITLE=Find%20and%20book',
        title: 'Find and book - LORENZO',
        },
         'pageEPRManageReferral': {
        url: 'AppDialog.aspx?TITLE=Manage%20referral%20',
        title: 'Manage referral - LORENZO',
        },

        'pageReopenReferral': {
        url: '/EPR/AppDialog.aspx?TITLE=Reopen%20referral%20',
        title: 'Reopen referral - LORENZO',
        },

        'pageCloseReferral': {
        url: '/EPR/AppDialog.aspx?TITLE=Close%20referral%20',
        title: 'Close referral - LORENZO',
        },
        
        'pageClinicalUnit':{
            url:'webclient_sso/EPR/AppTransfer',
            title: 'Def_Users',
        },
         'pageRegRegistration': {
        url: '/EPR/AppDialog.aspx?TITLE=Registration',
        title: 'Registration - LORENZO',
        
    },
         'pageIPPegboardCurrentView': {
        url: '/EPR/APPMAINPAGE',
        title: 'LORENZO',
        
    },
         'pageIPPegboardView': {
          url: 'WebClient_SSO/inpatient/Views/PbrdCurrview',
          title: 'IP Pegboard Current View',
    },
    'pageEPRView': {
        url: '/EPR/APPMAINPAGE',
        title: 'LORENZO',
    },

    'pagePDSSynchronisation': {
        url: '/EPR/APPMAINPAGE',
        title: 'LORENZO',
    },
    
    'pageAddressSFS': {
        url: 'webclient_sso/EPR/AddressSearchSFS.aspx',
        title: 'Address SFS - LORENZO',
    },
    'pageAppWizard': {
        url: 'AppWizardPage.aspx',
        title: ['Find and book - LORENZO', 'Registration - LORENZO', 'Create Admit - LORENZO'],
    },

    'pageCreateReferral': {
        url: '/EPR/AppDialog.aspx?TITLE=Create%20referral%20',
        title: 'Create referral - LORENZO',
    },
    'pageModifyReferralDetails': {
        url: '/EPR/AppDialog.aspx?TITLE=Modify%20referral%20',
        title: 'Modify referral - LORENZO',
    },
    'pageFindAndBookWizard': {
        url: 'AppWizardPage.aspx',
        title: 'Find and book - LORENZO',
    },
    'pagePbrdOverview': {
        url: 'WebClient_SSO/inpatient/Views/PbrdOverview',
        title: 'LORENZO',
   
    },
    'pagePbrdHistory': {
        url: '/EPR/APPMAINPAGE',
        title: 'LORENZO',
   
    },
    'pageHistoryTab': {
        url: 'WebClient_SSO/clinical%20narrative/clinical%20statement%20management/views/Risk/HistoryTab.aspx',
        title: 'HistoryTab',
   
    },
    'pageRecordalert': {
        url: '/EPR/AppDialog.aspx?TITLE=Record%20alert%',
        title: 'Record alert - LORENZO',
   
    },
    'pageModifyalert': {
        url: '/EPR/AppDialog.aspx?TITLE=Modify%20alert%',
        title: 'Modify alert - LORENZO',
   
    },
    'pageClosealert': {
        url: '/EPR/AppDialog.aspx?TITLE=Close%20alert%',
        title: 'Close alert - LORENZO',
   
    },
    'pageReopenalert': {
        url: '/EPR/AppDialog.aspx?TITLE=Re-open%20alert%',
        title: 'Re-open alert - LORENZO',
   
    },
      'pageStrikealert': {
        url: '/EPR/AppDialog.aspx?TITLE=Strikeout%20alert%',
        title: ' alert - LORENZO',
   
    },
    'pageHIALRRecordallergy': {
        url: 'EPR/AppDialog.aspx?TITLE=Record%20allergy',
        title: 'Record allergy/ADR - LORENZO',
   
    },

    'pageSearchClinic': {
        url: '/outpatient/Views/searchclinicresults.aspx?',
        title: 'LORENZO'
    },

    'pageHIALRModifyallergy': {
        url: '/EPR/AppDialog.aspx?TITLE=Modify%20allergy%',
        title: 'Modify allergy/ADR - LORENZO',
   
    },
      'pageHIALRCloseallergy': {
        url: '/EPR/AppDialog.aspx?TITLE=Close%20allergy%',
        title: 'Close allergy/ADR - LORENZO',
   
    },
      'pageHIALRStrikeallergy': {
        url: '/EPR/AppDialog.aspx?TITLE=Strikeout%20allergy%',
        title: 'Strikeout allergy/ADR - LORENZO',
   
    },
    ' pageHIALRReopenallergy': {
        url: '/EPR/AppDialog.aspx?TITLE=Re-open%20allergy%',
        title: 'Re-open allergy/ADR - LORENZO',
       },
       'pageCreateCareplan': {
        url: '/EPR/AppDialog.aspx?TITLE=Create%20care%20plan%20',
        title: 'Create care plan - LORENZO',
   
    },
    'pageCreatedocument': {
        url: '/EPR/AppDialog.aspx?TITLE=Create%20document%20',
        title: 'Create document - LORENZO',
   
    },
     'pageModifyCareplan': {
        url: '/EPR/AppDialog.aspx?TITLE=Modify%20care%20plan%20',
        title: 'Modify care plan - LORENZO',
   
    },
    'pageCopyCareplan': {
        url: '/EPR/AppDialog.aspx?TITLE=Copy%20care%20plan%20',
        title: 'Copy care plan - LORENZO',
   
    },
 
    'pageManageStatusCareplan': {
        url: '/EPR/AppDialog.aspx?TITLE=Manage%20status%20',
        title: 'Manage status - LORENZO',
   
    },

    'pageDITestUrl': {
        url: '/WebClient_sso/DIDITesturl.aspx',
        title: 'Encounter',
    },
 
}
    
    // 'pageSearchPatient': {
    //     url: '/EPR/APPMAINPAGE',
    //     title: 'LORENZO'
    // },
    // 'pageRoadMapButtons': {
    //     url: '/EPR/APPMAINPAGE',
    //     title: 'LORENZO'
    // },
    // 'pageDialongYesNoPopup': {
    //     url: '/EPR/APPMAINPAGE',
    //     title: 'LORENZO'
    // },
    // 'pageRegConfirmationpopup': {
    //     url: '/EPR/APPMAINPAGE',
    //     title: 'LORENZO'
    // },
    // 'pageDocumentTemplate': {
    //     url: '/EPR/APPMAINPAGE',
    //     title: 'LORENZO'
    // },
    // 'pagePatientSearchResult': {
    //     url: '/EPR/APPMAINPAGE',
    //     title: 'LORENZO'
    // },
    // 'pagePDSSync': {
    //     url: '/EPR/APPMAINPAGE',
    //     title: 'LORENZO'
    // },
    // 'pageEPRTab': {
    //     url: '/EPR/APPMAINPAGE',
    //     title: 'LORENZO'
    // },


export function getPageDefinition(pageName: string): PageDefinition | undefined {
    if (!pageName || pageName.trim() === '') {
        return undefined;
    }
    return PAGE_REGISTRY[pageName.trim()];
}
