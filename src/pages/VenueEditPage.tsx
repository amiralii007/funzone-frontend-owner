import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../state/authStore'
import { apiService } from '../services/apiService'
import VenueLocationMap from '../components/VenueLocationMap'
import BackButton from '../components/BackButton'
import { toPersianNumbers, toEnglishNumbers } from '../utils/persianNumbers'
import type { Venue } from '../types/owner'
import { ImageUploadService } from '../services/imageUploadService'

export default function VenueEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, isRTL, language } = useLanguage()
  const { state } = useAuth()
  
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    postal_code: '',
    latitude: 35.7219, // Default to Tehran coordinates
    longitude: 51.3347,
    amenities: [] as string[]
  })

  // Available amenities options with translation keys
  const amenityOptions = [
    { key: 'parking', label: t('owner.amenities.parking') },
    { key: 'nearMetro', label: t('owner.amenities.nearMetro') },
    { key: 'groupWatching', label: t('owner.amenities.groupWatching') },
    { key: 'restrooms', label: t('owner.amenities.restrooms') },
    { key: 'airConditioning', label: t('owner.amenities.airConditioning') },
    { key: 'wifi', label: t('owner.amenities.wifi') },
    { key: 'privateParking', label: t('owner.amenities.privateParking') },
    { key: 'projector', label: t('owner.amenities.projector') },
    { key: 'tvScreens', label: t('owner.amenities.tvScreens') },
    { key: 'soundSystem', label: t('owner.amenities.soundSystem') },
    { key: 'outdoorSpace', label: t('owner.amenities.outdoorSpace') },
    { key: 'library', label: t('owner.amenities.library') }
  ]

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.7219, 51.3347])
  const [selectedLocation, setSelectedLocation] = useState<[number, number]>([35.7219, 51.3347])

  // Load venue data
  useEffect(() => {
    if (id) {
      loadVenue(id)
    }
  }, [id])

  // Restore images from localStorage on component mount
  useEffect(() => {
    if (id) {
      const storedImages = JSON.parse(localStorage.getItem(`venue_${id}_images`) || '[]')
      if (storedImages.length > 0) {
        // Note: We can't restore File objects from localStorage, but we can show a message
        // that there are pending uploads
        console.log('Found stored images in localStorage:', storedImages.length)
      }
    }
  }, [id])



  const loadVenue = async (venueId: string) => {
    try {
      setLoading(true)
      const venueData = await apiService.getVenue(venueId)
      setVenue(venueData)
      
      // Handle amenities from API response
      let amenities = []
      if (venueData.amenities) {
        if (Array.isArray(venueData.amenities)) {
          amenities = venueData.amenities
        } else if (typeof venueData.amenities === 'string') {
          try {
            amenities = JSON.parse(venueData.amenities)
          } catch (e) {
            amenities = venueData.amenities.split(',').map((a: string) => a.trim())
          }
        }
      }
      
      setFormData({
        name: venueData.name || '',
        description: venueData.description || '',
        address: venueData.address || '',
        postal_code: venueData.postal_code ? venueData.postal_code.toString() : '',
        latitude: venueData.latitude || 35.7219,
        longitude: venueData.longitude || 51.3347,
        amenities: amenities
      })
      
      // Set map location
      setMapCenter([venueData.latitude, venueData.longitude])
      setSelectedLocation([venueData.latitude, venueData.longitude])
      
      // Load existing images
      const images = []
      if (venueData.image_url) {
        images.push(venueData.image_url)
      }
      if (venueData.gallery_images && Array.isArray(venueData.gallery_images)) {
        images.push(...venueData.gallery_images)
      }
      setExistingImages(images)
    } catch (error) {
      console.error('Error loading venue:', error)
      setVenue(null) // Set venue to null on error to show "not found" message
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // Convert Persian numbers to English for numeric fields
    const processedValue = name === 'postal_code' ? toEnglishNumbers(value) : value
    
    // For postal code, ensure it is exactly 10 digits
    if (name === 'postal_code') {
      const numericValue = processedValue.replace(/\D/g, '')
      if (numericValue.length > 10) {
        return // Don't update if more than 10 digits
      }
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }))
      return
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
  }

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }))
  }

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation([lat, lng])
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
      return isValidType && isValidSize
    })
    
    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Please ensure all files are images under 10MB.')
    }
    
    // Store files for upload
    setUploadedFiles(prev => [...prev, ...validFiles])
    
    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file))
    setPreviewImages(prev => [...prev, ...newPreviews])
    
    // Save to localStorage for persistence
    const storedImages = JSON.parse(localStorage.getItem(`venue_${id}_images`) || '[]')
    const newStoredImages = [...storedImages, ...validFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }))]
    localStorage.setItem(`venue_${id}_images`, JSON.stringify(newStoredImages))
  }

  const removeImage = (index: number) => {
    // Remove from uploaded files
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    
    // Remove from preview images
    setPreviewImages(prev => {
      const newPreviews = prev.filter((_, i) => i !== index)
      // Revoke the URL to free memory
      URL.revokeObjectURL(prev[index])
      return newPreviews
    })
    
    // Update localStorage
    const storedImages = JSON.parse(localStorage.getItem(`venue_${id}_images`) || '[]')
    const updatedStoredImages = storedImages.filter((_: any, i: number) => i !== index)
    localStorage.setItem(`venue_${id}_images`, JSON.stringify(updatedStoredImages))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Validate postal code is exactly 10 digits
      if (formData.postal_code && formData.postal_code.length !== 10) {
        alert(t('owner.postalCodeMustBe10Digits'))
        setSaving(false)
        return
      }
      
      // Upload images first if there are any
      let uploadedImageUrls: string[] = []
      if (uploadedFiles.length > 0) {
        setUploadingImages(true)
        try {
          const imageUploadService = new ImageUploadService()
          const uploadPromises = uploadedFiles.map(file => 
            imageUploadService.uploadImage(file, {
              imageType: 'venue_gallery',
              relatedSocialHubId: id!,
              title: `Venue ${venue?.name} - ${file.name}`,
              description: `Gallery image for ${venue?.name}`,
              isPublic: true
            })
          )
          
          const uploadResults = await Promise.all(uploadPromises)
          uploadedImageUrls = uploadResults.map(result => result.original_file)
          
          // Clear localStorage after successful upload
          localStorage.removeItem(`venue_${id}_images`)
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError)
          alert('Failed to upload images. Please try again.')
          setUploadingImages(false)
          setSaving(false)
          return
        } finally {
          setUploadingImages(false)
        }
      }
      
      // Prepare form data for API
      const submitData = {
        ...formData,
        postal_code: parseInt(formData.postal_code),
        latitude: selectedLocation[0],
        longitude: selectedLocation[1],
        // Add uploaded images to gallery_images
        gallery_images: [...existingImages, ...uploadedImageUrls]
      }

      // Update venue using apiService
      await apiService.updateVenue(id!, submitData)
      
      // Show success message
      alert('Venue updated successfully!')
      
      // Navigate back to venues page
      navigate('/venues')
    } catch (error) {
      console.error('Error saving venue:', error)
      alert('Failed to update venue. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/venues')
  }

  if (loading) {
    return (
      <div className={`container-responsive p-responsive flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className={`container-responsive p-responsive flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center">
          <p className="text-red-400">{t('common.venueNotFound')}</p>
          <button onClick={() => navigate('/venues')} className="btn-primary mt-4">
            {t('common.backToVenues')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`container-responsive p-responsive space-responsive ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton fallbackPath="/venues" />
          <div>
            <h1 className="text-responsive-xl font-bold">{t('owner.editVenue')}</h1>
            <p className="text-responsive-sm text-slate-400 mt-1">{venue.name}</p>
          </div>
        </div>
        
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="glass-card p-6">
            <h2 className="text-responsive-lg font-semibold mb-4">{t('owner.basicInformation')}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-responsive-sm font-medium text-slate-300 block mb-2">
                  {t('owner.venueName')} *
                </label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder={t('owner.venueName')}
                  required
                />
              </div>
              
              <div>
                <label className="text-responsive-sm font-medium text-slate-300 block mb-2">
                  {t('owner.venueDescription')}
                </label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input-field w-full h-24 resize-none"
                  placeholder={t('owner.venueDescription')}
                />
              </div>


            </div>
          </div>

          {/* Location Information */}
          <div className="glass-card p-6">
            <h2 className="text-responsive-lg font-semibold mb-4">{t('owner.locationInformation')}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-responsive-sm font-medium text-slate-300 block mb-2">
                  {t('owner.venueAddress')} *
                </label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder={t('owner.venueAddress')}
                  required
                />
              </div>
              
              <div>
                <label className="text-responsive-sm font-medium text-slate-300 block mb-2">
                  {t('owner.venuePostalCode')}
                </label>
                <input 
                  type="text" 
                  name="postal_code"
                  value={language === 'fa' ? toPersianNumbers(formData.postal_code) : formData.postal_code}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder={t('owner.venuePostalCode')}
                  dir="ltr"
                />
              </div>

              {/* Map for location selection */}
              <div>
                <label className="text-responsive-sm font-medium text-slate-300 block mb-2">
                  {t('owner.selectLocationOnMap')}
                </label>
                <VenueLocationMap
                  center={mapCenter}
                  selectedLocation={selectedLocation}
                  onLocationSelect={handleMapClick}
                  height="300px"
                />
                <div className="mt-2 flex items-center justify-between text-responsive-xs text-slate-400">
                  <span>
                    {t('owner.currentLocation')}: {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                  </span>
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                    📍 {t('owner.selectedLocation')}
                  </span>
                </div>
                <p className="text-responsive-xs text-slate-400 mt-2">
                  {t('owner.mapInstructions')}
                </p>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="glass-card p-6">
            <h2 className="text-responsive-lg font-semibold mb-4">{t('owner.amenitiesTitle')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {amenityOptions.map(amenity => (
                <label key={amenity.key} className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.amenities.includes(amenity.key)}
                    onChange={() => handleAmenityToggle(amenity.key)}
                    className="rounded border-slate-600 bg-slate-800 text-purple-400 focus:ring-purple-400"
                  />
                  <span className="text-responsive-sm text-slate-300">{amenity.label}</span>
                </label>
              ))}
            </div>
            {formData.amenities.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-400 mb-2">{t('owner.selectedAmenities')}:</p>
                <div className="flex flex-wrap gap-1">
                  {formData.amenities.map((amenityKey) => {
                    const amenity = amenityOptions.find(a => a.key === amenityKey)
                    return (
                      <span key={amenityKey} className="chip bg-purple-500/20 text-purple-400 text-xs">
                        {amenity?.label || amenityKey}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Photos */}
          <div className="glass-card p-6">
            <h2 className="text-responsive-lg font-semibold mb-4">{t('owner.photos')}</h2>
            
            {/* Enhanced Image Upload */}
            <div className="mb-6">
              <input 
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label 
                htmlFor="image-upload"
                className="group relative block w-full cursor-pointer"
              >
                <div className="border-2 border-dashed border-slate-600 group-hover:border-purple-400 group-hover:bg-purple-500/5 transition-all duration-200 rounded-xl p-8 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-responsive-sm font-semibold text-slate-200 mb-1">
                        {t('owner.uploadPhotos')}
                      </h3>
                      <p className="text-responsive-xs text-slate-400">
                        {t('owner.dragDropOrClick')}
                      </p>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-responsive-xs text-slate-500">
                      <span>JPG, PNG, WEBP</span>
                      <span>•</span>
                      <span>{t('owner.maxSize')} 10MB</span>
                    </div>
                  </div>
                </div>
              </label>
            </div>

            {/* Image Previews Grid */}
            {previewImages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-responsive-sm font-medium text-slate-300 mb-3">
                  {t('owner.newPhotos')} ({previewImages.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {previewImages.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <button 
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg"
                      >
                        ×
                      </button>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <h3 className="text-responsive-sm font-medium text-slate-300 mb-3">
                  {t('owner.existingPhotos')} ({existingImages.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {existingImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                        <img 
                          src={image} 
                          alt={`Venue ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            // Handle broken images
                            e.currentTarget.src = '/placeholder-venue.jpg'
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          setExistingImages(prev => prev.filter((_, i) => i !== index))
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCancel}
            className="btn-ghost flex-1"
            disabled={saving}
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSave}
            className="btn-primary flex-1"
            disabled={saving || uploadingImages}
          >
            {uploadingImages ? 'Uploading images...' : saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
