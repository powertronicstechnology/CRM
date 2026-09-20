export function paymentFields(payments) {
    const fields = { payments };
    for (let k = 1; k <= 5; k++) {
        const payment = payments[k - 1];
        fields[`payment_${k}`] = payment ? Number(payment.amount) : null;
        fields[`payment_remark_${k}`] = payment?.remark || null;
        fields[`payment_date_${k}`] = payment?.date || null;
    }
    return fields;
}
export function checklistFields(items) {
    const fields = { project_checklist: items };
    for (const item of items) {
        if (['file_ready_to_customer','file_given_to_customer','meter_file_submission','meter_instaled','panel_and_inverter','fabrication_and_wiring'].includes(item.id)) fields[item.id] = item.checked;
        if (['panel_and_inverter','fabrication_and_wiring'].includes(item.id)) fields[`${item.id}_remarks`] = item.remark || '';
    }
    return fields;
}
