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

        'pageCreateAdmit': {
        url: 'webclient_sso/EPR/AppTransfer',
        title: 'Create Admit - LORENZO',
        },

        'pageCreateReferral': {
        url: 'WebClient_SSO/identity%20management/wzforms/patientsearch',
        title: 'ReferralDetails',
        },
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
        url: 'AppDialog.aspx?TITLE=Find%20and%20book',
        title: 'Find and book - LORENZO',
        },
        'pageManageReferral': {
        url: 'WebClient_SSO/care%20management/Referral%20mgmt/wzforms/RFManageReferral',
        title: 'Manage referral - LORENZO',
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
        url: 'WebClient_SSO/identity%20management/views/Epr/EPRView',
        title: 'EPRView',
    },

    'pagePDSSynchronisation': {
        url: 'webclient_sso/EPR/AppTransfer.aspx?%3f__PageName=AppWizardPage',
        title: 'PDS Synchronisation - LORENZO',
    },
    
    'pageAddressSFS': {
        url: 'webclient_sso/EPR/AddressSearchSFS.aspx',
        title: 'Address SFS - LORENZO',
    },
    'pageAppWizard': {
        url: 'AppWizardPage.aspx',
        title: ['Find and book - LORENZO', 'Registration - LORENZO', 'Create Admit - LORENZO'],
    },
    'pageCreateReferralWizard': {
        url: 'AppWizardPage.aspx',
        title: 'Create referral - LORENZO',
    },
    'pageFindAndBookWizard': {
        url: 'AppWizardPage.aspx',
        title: 'Find and book - LORENZO',
    },

    'pageEditAppointment': {
        url: 'WebClient_SSO/enterprise%20scheduling/wzforms/OPSMEditAppointment.aspx?',
        title: 'Edit Appointment - LORENZO',
    },

    'pagePbrdOverview': {
        url: 'WebClient_SSO/inpatient/Views/PbrdOverview',
        title: 'LORENZO',
   
    },
    'pagePbrdHistory': {
        url: 'WebClient_SSO/inpatient/Views/PbrdHistory',
        title: 'LORENZO',

        },



    'pagefmMngAppStatDepart': {
        url: 'webclient_sso/EPR/APPMAINPAGE.ASPX',
        title: 'LORENZO',
   
    },    

    'pageDialongYesNoPopup': {
        url: 'webclient_sso/EPR/APPMAINPAGE.ASPX',
        title: 'LORENZO',
   
    },

    'pageDialongOKCancelPopup': {
        url: 'WebClient_SSO/iMsgDialog.aspx?',
        title: 'LORENZO',
   
    },

    'pageCBasicSearchCodingEntity': {
        url: 'webclient_sso/EPR/AppTransfer.aspx?',
        title: 'PatientSearchSFS',
 },
    'pageSearchClinic': {
        url: '/outpatient/Views/searchclinicresults.aspx?',
        title: 'LORENZO',
    },
    'pageDispatchVolumes': {
    //     url: '/views/CNTListView.aspx?',
    //     title: 'LORENZO',
    },
    
    'pageNewReport': {
        url: 'AppWizardPage.aspx',
        title: 'NewReportLORENZO',
        
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

     //'pageDialongYesNoPopup': {
      // url: '/EPR/APPMAINPAGE',
      //title: 'LORENZO'
   // },
   //  'pageRegConfirmationpopup': {
    // url: 'iMsgDialog.aspx?Title=Information',
       // title: 'LORENZO'
     //},
    //'pageDocumentTemplate': {
       //// url: '/EPR/APPMAINPAGE',
        // title: 'LORENZO'
     //},

  
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
