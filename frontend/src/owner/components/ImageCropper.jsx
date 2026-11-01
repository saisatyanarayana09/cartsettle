import React, { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageCompression from 'browser-image-compression';
import { Image as ImageIcon, Upload, X, Crop, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

export default function ImageCropper({ 
  aspect = 1, 
  aspectRatio,
  file = null,
  onCropComplete, 
  onCancel,
  currentImageUrl = null,
  label = "Upload Image",
  className = ""
}) {
  const defaultAspect = aspectRatio !== undefined ? aspectRatio : aspect;
  const [selectedAspect, setSelectedAspect] = useState(defaultAspect);
  const [modalOpen, setModalOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // When form resets from outside, update the preview URL
  React.useEffect(() => {
    setPreviewUrl(currentImageUrl);
  }, [currentImageUrl]);

  // Handle external file prop (e.g. Gallery Queue or Direct File)
  React.useEffect(() => {
    if (file) {
      setCrop(undefined);
      setSelectedAspect(defaultAspect);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  }, [file, defaultAspect]);

  const handleClose = React.useCallback(() => {
    setModalOpen(false);
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Handle Escape key to close modal
  React.useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isCompressing) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, isCompressing, handleClose]);

  function onSelectFile(e) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Reset crop
      setSelectedAspect(defaultAspect);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setModalOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
    // reset input so same file can be selected again
    e.target.value = '';
  }

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    applyAspectRatio(selectedAspect, width, height);
  }

  const applyAspectRatio = (newAspect, imgW, imgH) => {
    const width = imgW || imgRef.current?.width;
    const height = imgH || imgRef.current?.height;
    if (!width || !height) return;

    if (newAspect) {
      const initialCrop = centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, newAspect, width, height),
        width,
        height
      );
      setCrop(initialCrop);
      setCompletedCrop(initialCrop);
    } else {
      // Freeform crop
      const freeCrop = { unit: '%', width: 90, height: 90, x: 5, y: 5 };
      setCrop(freeCrop);
      setCompletedCrop(freeCrop);
    }
  };

  const handleAspectChange = (newAspect) => {
    setSelectedAspect(newAspect);
    applyAspectRatio(newAspect);
  };

  const handleApplyCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setIsCompressing(true);
    const loadingToast = toast.loading('Compressing image...');

    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const pixelRatio = window.devicePixelRatio || 1;
      
      canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);
      
      const ctx = canvas.getContext('2d');
      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';
      
      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;
      
      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });

      if (!blob) throw new Error("Canvas is empty");

      // Compress it with target size and dimension
      const fileObj = new File([blob], "product_image.jpg", { type: "image/jpeg" });
      let compressedFile = fileObj;
      try {
        compressedFile = await imageCompression(fileObj, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          fileType: "image/jpeg",
        });
      } catch (compErr) {
        console.warn('browser-image-compression fallback to canvas blob:', compErr);
      }

      // Show preview
      const objectUrl = URL.createObjectURL(compressedFile);
      setPreviewUrl(objectUrl);
      
      // Pass back to parent
      if (onCropComplete) {
        onCropComplete(compressedFile, objectUrl);
      }
      
      toast.dismiss(loadingToast);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error('Failed to crop and compress image');
    } finally {
      setIsCompressing(false);
    }
  };

  const baseAspectOptions = [
    { label: '1:1', val: 1 },
    { label: '4:3', val: 4 / 3 },
    { label: '3:4', val: 3 / 4 },
    { label: '16:9', val: 16 / 9 },
  ];
  // Surface the screen's recommended ratio (e.g. 3:1 or 4:1 banners) if it isn't a preset
  const hasDefaultPreset =
    defaultAspect === undefined ||
    baseAspectOptions.some((o) => Math.abs(o.val - defaultAspect) < 0.01);
  const aspectOptions = [
    ...(hasDefaultPreset
      ? []
      : [{ label: `${Number(defaultAspect.toFixed(2))}:1`, val: defaultAspect }]),
    ...baseAspectOptions,
    { label: 'Free', val: undefined },
  ];

  const renderModal = () => {
    if (!modalOpen) return null;
    return createPortal(
      <div 
        className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 pointer-events-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isCompressing) {
            handleClose();
          }
        }}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Crop className="w-5 h-5 text-indigo-600" />
              <h2>Crop & Compress Image</h2>
            </div>
            <button 
              type="button"
              onClick={handleClose}
              disabled={isCompressing}
              className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Aspect Ratio Toolbar */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 border-b border-slate-100 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0">Ratio:</span>
            {aspectOptions.map((opt, idx) => {
              const isActive = (selectedAspect === undefined && opt.val === undefined) ||
                (selectedAspect !== undefined && opt.val !== undefined && Math.abs(selectedAspect - opt.val) < 0.01);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAspectChange(opt.val)}
                  className={`px-3 py-1 text-xs rounded-lg font-bold shrink-0 transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          
          {/* Canvas Area */}
          <div className="p-4 bg-slate-900 flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={selectedAspect}
                className="max-h-[60vh] object-contain rounded shadow-sm"
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  className="max-h-[60vh] max-w-full"
                />
              </ReactCrop>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCompressing}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isCompressing || !completedCrop?.width || !completedCrop?.height}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompressing ? (
                <>Compressing...</>
              ) : (
                <>
                  <Check size={18} /> Apply & Compress
                </>
              )}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  if (file) {
    return renderModal();
  }

  return (
    <div className={className}>
      <input 
        type="file" 
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif,.svg" 
        ref={fileInputRef}
        onChange={onSelectFile}
        className="hidden"
      />
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Preview Bubble */}
        <div 
          className={`shrink-0 rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center bg-slate-50 transition-colors
            ${previewUrl ? 'border-indigo-200' : 'border-slate-300'}`}
          style={{ 
            width: defaultAspect >= 1 ? '120px' : '80px', 
            height: defaultAspect >= 1 ? `${120 / defaultAspect}px` : '120px',
            minHeight: '80px'
          }}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="text-slate-400 w-6 h-6" />
          )}
        </div>

        {/* Upload Action */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-sm transition-colors w-fit"
          >
            <Upload size={16} />
            {previewUrl ? "Replace Image" : label}
          </button>
          <p className="text-xs text-slate-500 font-medium">All image types (JPG, PNG, WebP, HEIC) auto-compressed</p>
        </div>
      </div>

      {/* Crop Modal */}
      {renderModal()}
    </div>
  );
}
