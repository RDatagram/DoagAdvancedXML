/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 *
 *
 */
define(['N/file', 'N/record', 'N/render', '../lib/rdata_sef_util', '../lib/rdata_sef_sinv_util','../lib/rdata_sef_api.js'],
    /**
 * @param{file} file
     * @param {Record} record
     * @param {render} render
     * @param sef_util
     * @param sef_api
     * @param sef_sinv_util
     *
 */
    (file, record, render, sef_util, sef_sinv_util, sef_api) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {

            const invoiceRecord = scriptContext.newRecord;
            const tranid = invoiceRecord.getValue('tranid');
            const sinvName = 'SINV#-' + tranid;
            const taxcodeObject = sef_sinv_util.getTaxCodes();

            log.debug({
                title : 'onAction.taxcodeObject',
                details : taxcodeObject
            })
            const sinvRecord = record.create(
                {
                    type : 'customrecord_rdata_sef_salesinv'
                }
            );

            const templateFile = file.load({
                id: '../templates/ef.tmpl.xml'
            });

            const content = templateFile.getContents();

            let renderer = render.create();

            renderer.templateContent = content;


            let sinvData = {};
            sinvData["ef_invoice_id"] = tranid;
            sinvData["IssueDate"] = sef_util.dateToSef(new Date());
            sinvData["DueDate"] = sef_util.dateToSef(new Date());
            sinvData["AccountingCustomerParty"] = sef_sinv_util.getCustomerSEFData(invoiceRecord.getValue('entity'));
            sinvData["AccountingSupplierParty"] = sef_sinv_util.getSupplierSEFData(invoiceRecord.getValue('subsidiary'));

            sinvData["LegalMonetaryTotal"] = {};
            sinvData["LegalMonetaryTotal"]["currencyID"] = "RSD";

            //LineExtensionAmount = suma stavki
            sinvData["LegalMonetaryTotal"]["LineExtensionAmount"] = {};
            sinvData["LegalMonetaryTotal"]["LineExtensionAmount"]["value"] = invoiceRecord.getValue('subtotal');

            sinvData["LegalMonetaryTotal"]["TaxExclusiveAmount"] = {};
            sinvData["LegalMonetaryTotal"]["TaxExclusiveAmount"]["value"] = invoiceRecord.getValue('subtotal');

            sinvData["LegalMonetaryTotal"]["TaxInclusiveAmount"] = {};
            sinvData["LegalMonetaryTotal"]["TaxInclusiveAmount"]["value"] = invoiceRecord.getValue('total');

            sinvData["InvoiceLines"] = sef_sinv_util.getInvoiceLines(invoiceRecord,taxcodeObject);
            sinvData["TaxTotal"] = sef_sinv_util.getTaxTotal(invoiceRecord,taxcodeObject);

            let jsonObj = {
                sinvObj : sinvData
            };

            log.debug({
                title : 'onAction.jsonObj',
                details : jsonObj
            });

            renderer.addCustomDataSource({
                format: render.DataSource.JSON,
                alias: "JSON",
                data: JSON.stringify(jsonObj)
            });

            const xmlString = renderer.renderAsString();

            let xmlFile = file.create({
                name : sinvName + '.xml',
                fileType : file.Type.XMLDOC,
                contents : xmlString
            });

            xmlFile.folder = templateFile.folder;

            const idFile = xmlFile.save({

            });

            sinvRecord.setValue('name',sinvName);
            sinvRecord.setValue('custrecord_rdata_sef_saleinv_tranid',invoiceRecord.id);
            sinvRecord.setValue('custrecord_rdata_sef_salesinv_xml',idFile);

            let sinvId;
            //sinvId = -1;
            sinvId = sinvRecord.save();

            const timesmp = Date.now;
            let requestId;
            requestId = tranid + '-' + timesmp;

            sef_api.sendSalesInvoice(requestId,idFile);

            return sinvId;
        }

        return {onAction};
    });