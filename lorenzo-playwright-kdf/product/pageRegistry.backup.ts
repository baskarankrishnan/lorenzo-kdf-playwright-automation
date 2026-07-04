// BACKUP: Original pageRegistry.ts (created May 25, 2026)
// Restore this file by renaming to pageRegistry.ts if needed

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
        title: 'Manage referral',
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
    }

    }

export function getPageDefinition(pageName: string): PageDefinition | undefined {
    if (!pageName || pageName.trim() === '') {
        return undefined;
    }
    return PAGE_REGISTRY[pageName.trim()];
}
