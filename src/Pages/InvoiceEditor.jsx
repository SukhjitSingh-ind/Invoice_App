import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, Eye, Save, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Package } from 'lucide-react';
import { getInvoice, saveInvoice, createEmptyInvoice, getNextInvoiceNumber, checkInvoiceNumberExists } from '../services/invoiceService';
import { getSettings, getActiveProfile } from '../services/settingsService';
import { getClient, upsertClient } from '../services/clientService';
import { getAllItems } from '../services/itemService';
import { numberToWords } from '../utils/numberToWords';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations';
import { validateGST } from '../utils/validation';


// Images
import logoImg from '../assets/Logo_1_HD.png';
import { useToast } from '../components/Toast';

// Sub-components
import InvoiceHeader from '../components/InvoiceEditor/InvoiceHeader';
import InvoiceItemsTable from '../components/InvoiceEditor/InvoiceItemsTable';
import InvoiceFooter from '../components/InvoiceEditor/InvoiceFooter';


export default function InvoiceEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  const clientId = searchParams.get('clientId');
  const isGSTParam = searchParams.get('gst') === 'true';
  const [settings, setSettings] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const { addToast } = useToast();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [libraryItems, setLibraryItems] = useState([]);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState('');
  const [showCustomization, setShowCustomization] = useState(false);
  const [customization, setCustomization] = useState({
    backgroundColor: '',
    fontColor: '',
    backgroundImage: ''
  });

  useEffect(() => {
    // Load settings and library items
    const currentSettings = getSettings();
    setSettings(currentSettings);
    const items = getAllItems();
    setLibraryItems(items);

    if (id && id !== 'new') {
      const data = getInvoice(id);
      if (data) {
        setInvoice(data);
        if (data.customization) {
          setCustomization(data.customization);
        }
      } else {
        navigate('/');
      }
    } else {
      // Create new
      const newInv = createEmptyInvoice();
      newInv.number = getNextInvoiceNumber();
      if (templateId) newInv.template = templateId;

      // Load client data if clientId is provided
      if (clientId) {
        const clientData = getClient(clientId);
        if (clientData) {
          newInv.recipient.name = clientData.name;
          newInv.recipient.mobile = clientData.mobile;
          newInv.recipient.address = clientData.address || '';
          if (clientData.gstNumber) {
            newInv.recipient.gstNumber = clientData.gstNumber;
          }
        }
      }

      // Apply active company profile details to sender and bank details
      const activeProfile = getActiveProfile();
      if (activeProfile) {
        newInv.sender.name = activeProfile.name || newInv.sender.name;
        newInv.sender.address = activeProfile.address || newInv.sender.address;
        newInv.sender.phone = activeProfile.phone || newInv.sender.phone;
        newInv.sender.gstNumber = activeProfile.gstNumber || newInv.sender.gstNumber;

        if (activeProfile.bankDetails) {
          newInv.bankDetails = {
            ...(newInv.bankDetails || {}),
            ...activeProfile.bankDetails,
          };
        }
      }

      if (isGSTParam) newInv.isGST = true;
      setInvoice(newInv);
      if (newInv.customization) {
        setCustomization(newInv.customization);
      }
    }
  }, [id, navigate, searchParams, templateId, clientId, isGSTParam]);

  if (!invoice || !settings) return <div>Loading...</div>;

  // Calculations (shared utility)
  const {
    subtotal,
    taxAmount,
    igstAmount,
    cgstAmount,
    sgstAmount,
    preDiscountTotal,
    discountAmount,
    total,
    balance,
  } = calculateInvoiceTotals(invoice);
  const amountInWords = numberToWords(isNaN(total) ? 0 : total);

  // Active company profile for logo and defaults
  const activeCompanyProfile =
    settings?.companyProfiles?.find((p) => p.id === settings?.activeProfileId) || null;
  const logoSrc = activeCompanyProfile?.logo || logoImg;

  // Validation
  const validateInvoice = () => {
    const errors = {};

    // Validate invoice number
    if (settings.validation.requireInvoiceNumber && !invoice.number.trim()) {
      errors.invoiceNumber = 'Invoice number is required';
    } else if (checkInvoiceNumberExists(invoice.number, invoice.id)) {
      errors.invoiceNumber = 'Invoice number already exists';
    }

    // Validate client name
    if (settings.validation.requireClientName && !invoice.recipient.name.trim()) {
      errors.clientName = 'Client name is required';
    }

    // Validate client mobile
    if (settings.validation.requireClientMobile && !invoice.recipient.mobile.trim()) {
      errors.clientMobile = 'Client mobile is required';
    }

    // Validate GST Number
    if (invoice.isGST && invoice.recipient.gstNumber && !validateGST(invoice.recipient.gstNumber)) {
      errors.gstNumber = 'Invalid GST Number format';
    }

    // Validate Seller GST Number
    if (invoice.isGST && invoice.sender.gstNumber && !validateGST(invoice.sender.gstNumber)) {
      errors.sellerGstNumber = 'Invalid Seller GST Number format';
    }

    // Validate items
    invoice.items.forEach((item, index) => {
      // Validate price
      if (settings.validation.priceGreaterThanZero && item.price <= 0) {
        errors[`price_${item.id}`] = 'Price must be greater than zero';
      }

      // Validate quantity
      if (settings.validation.quantityGreaterThanZero && item.quantity <= 0) {
        errors[`quantity_${item.id}`] = 'Quantity must be greater than zero';
      }

      // Validate description
      if (settings.validation.requireItemDescription && !item.description.trim()) {
        errors[`description_${item.id}`] = 'Item description is required';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleSave = () => {
    if (!validateInvoice()) {
      addToast('Please fix the validation errors before saving.', 'error');
      return;
    }

    // Auto-save/Update client
    if (invoice.recipient && invoice.recipient.name) {
      upsertClient(invoice.recipient);
    }

    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors(validationErrors);
      addToast('Please check the highlighted fields', 'error');
      return;
    }

    const savedInvoice = saveInvoice({ ...invoice, customization });
    addToast('Invoice saved successfully!', 'success');
    navigate(`/preview/${savedInvoice.id}`);
  };

  const handleChange = (section, field, value) => {
    setInvoice(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleItemChange = (id, field, value) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
    // Clear validation error for this field when user edits it
    if (validationErrors[`${field}_${id}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${field}_${id}`];
        return newErrors;
      });
    }
  };

  const addItem = () => {
    const newId = Math.max(...invoice.items.map(i => i.id), 0) + 1;
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { id: newId, description: '', quantity: 1, price: 0, hsnSac: '', unit: 'Pcs', gstRate: 18 }]
    }));
  };

  const addItemFromLibrary = () => {
    if (!selectedLibraryItem) {
      addToast('Please select an item from the library', 'warning');
      return;
    }

    const libraryItem = libraryItems.find(item => item.id === parseInt(selectedLibraryItem));
    if (!libraryItem) return;

    const newId = Math.max(...invoice.items.map(i => i.id), 0) + 1;
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, {
        id: newId,
        description: libraryItem.name + (libraryItem.description ? ` - ${libraryItem.description}` : ''),
        quantity: 1,
        price: libraryItem.defaultPrice,
        hsnSac: libraryItem.hsnSac || '',
        unit: libraryItem.unit || 'Pcs',
        gstRate: libraryItem.gstRate || 18
      }]
    }));

    setSelectedLibraryItem('');
    addToast('Item added from library', 'success');
  };

  const removeItem = (id) => {
    setInvoice(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const handleDetailedItemChange = (id, field, value) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleCustomizationChange = (field, value) => {
    setCustomization(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        addToast('Image size should be less than 500KB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleCustomizationChange('backgroundImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearBackgroundImage = () => {
    handleCustomizationChange('backgroundImage', '');
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    setInvoice(prev => {
      const sortedItems = [...prev.items].sort((a, b) => {
        let aValue, bValue;

        if (key === 'amount') {
          aValue = (a.quantity || 0) * (a.price || 0);
          bValue = (b.quantity || 0) * (b.price || 0);
        } else {
          aValue = a[key];
          bValue = b[key];
        }

        if (typeof aValue === 'string') {
          return direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      });
      return { ...prev, items: sortedItems };
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />;
  };

  const handleChangeWrapper = (section, field, value) => {
    if (section === 'isIGST') {
      setInvoice(prev => ({ ...prev, isIGST: value }));
    } else if (section === 'placeOfSupply') {
      setInvoice(prev => ({ ...prev, placeOfSupply: value }));
    } else if (section === 'number') {
      setInvoice(prev => ({ ...prev, number: value }));
      if (validationErrors.invoiceNumber) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.invoiceNumber;
          return newErrors;
        });
      }
    } else if (section === 'date') {
      setInvoice(prev => ({ ...prev, date: value }));
    } else {
      handleChange(section, field, value);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 font-sans text-slate-900 pb-20">

      {/* Validation Errors Banner */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="max-w-4xl mx-auto pt-4 px-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-red-800 font-bold mb-1">Validation Errors</h3>
                <ul className="text-red-700 text-sm space-y-1">
                  {Object.values(validationErrors).map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumbs & Actions */}
      <div className="max-w-4xl mx-auto pt-8 px-4 flex justify-between items-end">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => navigate('/dashboard')} className="hover:text-blue-600 font-medium transition-colors">Dashboard</button>
          <ChevronRight size={14} />
          <span className="font-bold text-slate-800">Edit Invoice {invoice.number}</span>
        </div>
        <button
          onClick={() => setShowCustomization(!showCustomization)}
          className="bg-purple-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-md hover:bg-purple-700 transition-all font-sans"
          title="Customize Design"
        >
          <Package size={16} /> Design
        </button>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-md hover:bg-blue-700 transition-all font-sans"
        >
          <Save size={16} /> Save & Preview
        </button>
      </div>

      {/* Customization Panel */}
      {
        showCustomization && (
          <div className="max-w-4xl mx-auto px-4 mt-6">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-purple-100">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package className="text-purple-600" /> Design Customization
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Background Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={customization.backgroundColor || '#ffffff'}
                      onChange={(e) => handleCustomizationChange('backgroundColor', e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border border-slate-300"
                    />
                    <button
                      onClick={() => handleCustomizationChange('backgroundColor', '')}
                      className="text-xs text-slate-500 hover:text-red-500 underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Font Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={customization.fontColor || '#000000'}
                      onChange={(e) => handleCustomizationChange('fontColor', e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border border-slate-300"
                    />
                    <button
                      onClick={() => handleCustomizationChange('fontColor', '')}
                      className="text-xs text-slate-500 hover:text-red-500 underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Background Image</label>
                  {customization.backgroundImage ? (
                    <div className="relative w-full h-12 bg-slate-100 rounded border border-slate-300 flex items-center px-3 justify-between">
                      <span className="text-xs text-slate-600 truncate">Image uploaded</span>
                      <button
                        onClick={clearBackgroundImage}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                        title="Remove Image"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-purple-50 file:text-purple-700
                      hover:file:bg-purple-100"
                    />
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">Max size: 500KB</p>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <div className="flex justify-center mt-6 px-4">
        <div className="bg-white shadow-xl min-h-[1123px] w-full max-w-4xl p-12 relative text-black font-sans rounded-sm ring-1 ring-slate-900/5">

          <InvoiceHeader
            invoice={invoice}
            handleChange={handleChangeWrapper}
            settings={settings}
            validationErrors={validationErrors}
            logoSrc={logoSrc}
          />

          {/* Item Library Selector */}
          {libraryItems.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <Package className="text-blue-600" size={20} />
                <h3 className="text-sm font-bold text-blue-900">Add from Item Library</h3>
              </div>
              <div className="flex gap-3 mt-3">
                <select
                  value={selectedLibraryItem}
                  onChange={(e) => setSelectedLibraryItem(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-medium"
                >
                  <option value="">Select an item from library...</option>
                  {libraryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} - ₹{item.defaultPrice.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addItemFromLibrary}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-2">💡 Tip: Items from library can have their prices edited in the invoice table below</p>
            </div>
          )}

          <InvoiceItemsTable
            invoice={invoice}
            handleItemChange={handleItemChange}
            removeItem={removeItem}
            addItem={addItem}
            handleSort={handleSort}
            sortConfig={sortConfig}
            validationErrors={validationErrors}
            subtotal={subtotal}
            igstAmount={igstAmount}
            cgstAmount={cgstAmount}
            sgstAmount={sgstAmount}
            discountAmount={discountAmount}
            total={total}
            setInvoice={setInvoice}
          />

          <InvoiceFooter
            invoice={invoice}
            setInvoice={setInvoice}
            amountInWords={amountInWords}
          />

        </div>
      </div>
    </div >
  );
}