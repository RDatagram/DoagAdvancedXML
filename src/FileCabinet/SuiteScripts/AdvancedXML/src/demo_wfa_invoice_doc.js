/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/render', 'N/file'],
    /**
 * @param{render} render
     * @param file
 */
    (render, file) => {
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
            const xmlTemplateFile = file.load({
                id : '../templates/word.template.xml'
            });
            const  xmlTemplate = xmlTemplateFile.getContents();
            const renderer = render.create();
            renderer.templateContent = xmlTemplate;

            const numberOfLines = scriptContext.newRecord.getLineCount({
                sublistId: 'item'
            });

            let jsonData = {};
            jsonData.items = [];

            for (let i = 0; i < numberOfLines; i++) {
                const itemId = scriptContext.newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });

                const quantity = scriptContext.newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                });

                const amount = scriptContext.newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i
                });

                jsonData.items.push(
                    {
                        "item" : itemId,
                        "quantity" : quantity,
                        "amount" : amount
                    }
                )
                log.debug('Item: ' + itemId + ', Quantity: ' + quantity);
            }


            renderer.addCustomDataSource({
                format: render.DataSource.JSON,
                alias: "JSON",
                data: JSON.stringify(jsonData)
            });

            // render as string
            const renderedContent = renderer.renderAsString();
            const xlsFile = file.create({
                name: 'invoice.doc',
                fileType: file.Type.XMLDOC,
                contents: renderedContent
            });
            log.debug('Rendered Content:', renderedContent);
            xlsFile.folder = 417;
            xlsFile.save();

        }

        return {onAction};
    });
