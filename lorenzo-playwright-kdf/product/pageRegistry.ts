import { url } from "inspector/promises";

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
    'pagePbrdOverview': {
        url: 'WebClient_SSO/inpatient/Views/PbrdOverview',
        title: 'LORENZO',
   
    },
    'pagePbrdHistory': {
        url: 'WebClient_SSO/inpatient/Views/PbrdHistory',
        title: 'LORENZO',
   
    },
    'pageEditBedBooking': {
        url: 'WebClient_SSO/Enterprise%20Scheduling/WZForms/IPSMEditBedBooking',
        title: 'Edit booking - LORENZO',
    },
        'pageAdmitIPAdmitRoad': {
        url: 'WebClient_SSO/inpatient/wzforms/patadmotherdetails',
        title: 'Create Admit - LORENZO',
    },
        'pagePatADMEditAdmission': {
        url: 'WebClient_SSO/inpatient/wzforms/patadmeditadmission',
        title: 'Modify Admit - LORENZO',
    },
        'pagePatienttransfer': {
        url: 'WebClient_SSO/inpatient/wzforms/pattrspatienttransfer',
        title: 'Patient transfer - LORENZO',
    },
       'pagepatlevRetroPatientLeave': {
        url: 'webclient_sso/EPR/AppDialog',
        title: 'Patient leave - LORENZO',
    },
        'pageFmMedicalDischarge': {
        url: 'WebClient_SSO/inpatient/wzforms/patdsgmedicaldischarge.aspx',
        title: 'PMedical discharge - LORENZO',
    },
        'pageDischarge': {
        url: 'webclient_sso/EPR/AppDialog.aspx',
        title: 'Discharge - LORENZO',
    },
        'pagepatientsummaryview': {
        url: 'WebClient_SSO/identity%20management/views/PatientRegistration/patientsummaryview',
        title: 'patientsummaryview',
    },

        'pageSearchReferral': {
        url: 'webclient_sso/EPR/AppTransfer',
        title: 'SearchReferral',
        
    },
        'pageWamanageattstatus': {
        url: 'webclient_sso/EPR/AppTransfer.aspx?%3f__PageName=AppWizardPage',
        title: 'Manage attendance - LORENZO',
       
    },
        'pageTheatreSearchSesion': {
        url: 'webclient_sso/Theatres/views/LTMSessionSearch',
        title: 'Search session',
       
    },
        'pageBookTheatre': {
        url: 'WebClient_SSO/identity%20management/WZforms/patientbasicsearch',
        title: 'PatientBasicSearch',
    },
        'pageTheatreBookSession': {
        url: 'webclient_sso/EPR/AppDialog.aspx?TITLE=Book%20-%20LORENZO&__PageName=AppWizardPage',
        title: 'Book - LORENZO',
    },
        'pageModifybooking': {
        url: 'webclient_sso/EPR/AppDialog.aspx?TITLE=Modify%20booking%20-%20LORENZO&__PageName=AppWizardPage',
        title: 'Modify booking - LORENZO',
    }, 
        'pageTheatreManagement':{
            url: '/EPR/APPMAINPAGE',
            title: 'LORENZO'
    },

        'pageSNOMEDDATA':{
            url: 'WebClient_SSO/Theatres/InTheatre/#/landing/patient-hub',
            title: 'Theatre Management'
    },
            'pageMedicationAddtionOptionpop':{
            url: 'webclient_sso/MedicationMgmt/IPP_P2/views/MedClerkingSource',
            title: 'Medication Clerking Source'
    },
        'pageMediClerking':{
            url: 'webclient_sso/EPR/AppTransfer.aspx?%3f__PageName=AppWizardPage',
            title: 'Medication clerking - LORENZO'
    },
        'pageInpatientmedication':{
            url: 'webclient_sso/EPR/AppTransfer.aspx?%3f__PageName=AppWizardPage',
            title: 'Inpatient medication - LORENZO'
    },
        'pagePrintNote':{
            url: 'WebClient_SSO/MedicationMgmt/LBMCommon/uiscripts/uiscripts/lorappmanageprescriptionbbui',
            title: 'LORENZO--Webpage Dialog'
        },
        'pagePrintdocument':{
            url: 'webclient_sso/EPR/AppTransfer.aspx?%3f__PageName=AppWizardPage',
            title: 'Print document - LORENZO'
        },
        'pageMedicationEPR':{
            url: 'WebClient_SSO/MedicationMgmt/IPP_P2/views/MedTabs',
            title: 'Medication EPR - LORENZO        '
        },
        'pageMedicationadministrationchart':{
            url: 'webclient_sso/EPR/AppTransfer.aspx?%3f__PageName=AppWizardPage',
            title: 'Medication administration chart - LORENZO'
        },
        'PagePrescriptionchart':{
            url: 'webclient_sso/EPR/AppTransfer.aspx?%3f__PageName=AppWizardPage.aspx',
            title: 'Prescription chart - LORENZO'
      },
    'pagefmMngAppStatDepart': {
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
    'pageNewReport': {
        url: 'AppWizardPage.aspx',
        title: 'NewReportLORENZO',
    },
    'pageReinstateRequest': {
        url: 'AppWizardPage.aspx',
        title: 'pageRe-instaterequestLORENZO',
    },
    'pageRepeatrequest': {
        url: 'APPMAINPAGE.ASPX',
        title: 'pageRepeatrequestLORENZO',
    },
    'pageCurrentpregnancy': {
        url: '/EPR/AppDialog.aspx?TITLE=Manage%20current%20pregnancy%',
        title: 'Manage current pregnancy record - LORENZO',
    },
    'pageLabourandDelivery': {
        url: '/EPR/AppDialog.aspx?TITLE=Manage%20labour%20and%20delivery%20summary%20-%20LORENZO&__PageName=AppWizardPage.aspx',
        title: 'Manage labour and delivery summary - LORENZO',
    },
    'pageCreatedocument': {
        url: '/EPR/AppTransfer.aspx?%3f__PageName=AppWizardPage.aspx',
        title: 'Create document - LORENZO',
    },
    'pageManageAppointmentstatus': {
        url: '/WebClient_SSO/Daycare/WZForms/DcsmMngAppmntStatus.aspx?WF_InstanceID=3aa3e8f8-fb43-4331-b963-bead7a2008ee',
        title: 'Manage appointment status - LORENZO',
    },
    'pageClosealert': {
    url: '/EPR/AppDialog.aspx?TITLE=Close%20alert%',
    title: 'Close alert - LORENZO',
    
    },
    'pageCloseReferral': {
    url: '/EPR/AppDialog.aspx?TITLE=Close%20referral%20',
    title: 'Close referral - LORENZO',
    },
    'pageCopyCareplan': {
    url: '/EPR/AppDialog.aspx?TITLE=Copy%20care%20plan%20',
    title: 'Copy care plan - LORENZO',
    
    },
    'pageCreateCareplan': {
    url: '/EPR/AppDialog.aspx?TITLE=Create%20care%20plan%20',
    title: 'Create care plan - LORENZO',
    
    },
    'pageDITestUrl': {
    url: '/WebClient_sso/DIDITesturl.aspx',
    title: 'Encounter',
    },
    'pageEPRManageReferral': {
    url: 'AppDialog.aspx?TITLE=Manage%20referral%20',
    title: 'Manage referral - LORENZO',
    },
    'pageHIALRCloseallergy': {
    url: '/EPR/AppDialog.aspx?TITLE=Close%20allergy%',
    title: 'Close allergy/ADR - LORENZO',
    
    },
    'pageHIALRModifyallergy': {
    url: '/EPR/AppDialog.aspx?TITLE=Modify%20allergy%',
    title: 'Modify allergy/ADR - LORENZO',
    
    },
    'pageHIALRRecordallergy': {
    url: 'EPR/AppDialog.aspx?TITLE=Record%20allergy',
    title: 'Record allergy/ADR - LORENZO',
    
    },
    'pageHIALRStrikeallergy': {
    url: '/EPR/AppDialog.aspx?TITLE=Strikeout%20allergy%',
    title: 'Strikeout allergy/ADR - LORENZO',
    
    },
    'pageHistoryTab': {
    url: 'WebClient_SSO/clinical%20narrative/clinical%20statement%20management/views/Risk/HistoryTab.aspx',
    title: 'HistoryTab',
    
    },
    'pageManageStatusCareplan': {
    url: '/EPR/AppDialog.aspx?TITLE=Manage%20status%20',
    title: 'Manage status - LORENZO',
    
    },
    'pageMngRelationShips': {
    url: '/EPR/AppDialog.aspx?TITLE=Manage%20relationships%20',
    title: 'Manage relationships - LORENZO'
    },
    'pageModifyalert': {
    url: '/EPR/AppDialog.aspx?TITLE=Modify%20alert%',
    title: 'Modify alert - LORENZO',
    
    },
    'pageModifyCareplan': {
    url: '/EPR/AppDialog.aspx?TITLE=Modify%20care%20plan%20',
    title: 'Modify care plan - LORENZO',
    
    },
    'pageModifyReferralDetails': {
    url: '/EPR/AppDialog.aspx?TITLE=Modify%20referral%20',
    title: 'Modify referral - LORENZO',
    },
    'pageRecordalert': {
    url: '/EPR/AppDialog.aspx?TITLE=Record%20alert%',
    title: 'Record alert - LORENZO',
    
    },
    'pageReopenalert': {
    url: '/EPR/AppDialog.aspx?TITLE=Re-open%20alert%',
    title: 'Re-open alert - LORENZO',
    
    },
    'pageReopenReferral': {
    url: '/EPR/AppDialog.aspx?TITLE=Reopen%20referral%20',
    title: 'Reopen referral - LORENZO',
    },
    'pageStrikealert': {
    url: '/EPR/AppDialog.aspx?TITLE=Strikeout%20alert%',
    title: ' alert - LORENZO',
    
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
