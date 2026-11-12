import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getSettings } from '../services/settingsService';
import qrCodeImg from '../assets/QRCODE_1.jpg';

const PaymentQRCode = ({ amount, note, size = 128, className = "" }) => {
    const settings = getSettings();
    const { upiId, payeeName } = settings.payment || {};

    if (!upiId) {
        // Fallback to static image if no UPI ID is configured
        return (
            <img
                src={qrCodeImg}
                alt="Scan to Pay"
                className={className}
                style={{ width: size, height: size }}
            />
        );
    }

    const upiURL = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName || '')}&am=${amount}&cu=INR&tn=${encodeURIComponent(note || '')}`;

    return (
        <div className={`bg-white p-2 ${className}`} style={{ width: 'fit-content' }}>
            <QRCodeSVG
                value={upiURL}
                size={size}
                level={"M"}
                includeMargin={false}
            />
        </div>
    );
};

export default PaymentQRCode;
