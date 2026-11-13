import React, { useState, useEffect } from 'react';
import { Folder, ChevronLeft, ChevronRight, X, ZoomIn, Heart, Plus, Trash2, Upload, Loader2, Sparkles } from 'lucide-react';
import { WEDDING_CONFIG, PhotoItem, PhotoFolder } from '../config/weddingConfig';
import { WeddingDataService } from '../services/weddingDataService';
import { useAuth } from '../context/AuthContext';

interface PhotoAlbumProps {
  onShowToast: (msg: string) => void;
}

export const PhotoAlbum: React.FC<PhotoAlbumProps> = ({ onShowToast }) => {
  const { isAdmin } = useAuth();

  const [folders, setFolders] = useState<PhotoFolder[]>(WEDDING_CONFIG.photoFolders);
  const [photos, setPhotos] = useState<PhotoItem[]>(WEDDING_CONFIG.photos);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('folder-wedding');
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [likedPhotos, setLikedPhotos] = useState<Record<string, boolean>>({});

  // Admin Modal States
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoDate, setPhotoDate] = useState('2025.10.12');
  const [photoLocation, setPhotoLocation] = useState('서울');
  const [photoTargetFolder, setPhotoTargetFolder] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Photo delete confirmation
  const [deleteTargetPhoto, setDeleteTargetPhoto] = useState<PhotoItem | null>(null);

  // Subscribe to Firestore Folders & Photos
  useEffect(() => {
    const unsubFolders = WeddingDataService.subscribePhotoFolders((items) => {
      if (items && items.length > 0) {
        setFolders(items);
        // If current selected folder is not in items, select first
        setSelectedFolderId((curr) => {
          if (!items.some((f) => f.id === curr)) {
            return items[0].id;
          }
          return curr;
        });
      }
    });

    const unsubPhotos = WeddingDataService.subscribePhotos((items) => {
      if (items && items.length > 0) {
        setPhotos(items);
      }
    });

    return () => {
      unsubFolders();
      unsubPhotos();
    };
  }, []);

  const currentPhotos = photos.filter((p) => p.folderId === selectedFolderId);

  const openLightbox = (photo: PhotoItem, index: number) => {
    setLightboxPhoto(photo);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxPhoto(null);
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentPhotos.length === 0) return;
    const nextIdx = (lightboxIndex + 1) % currentPhotos.length;
    setLightboxIndex(nextIdx);
    setLightboxPhoto(currentPhotos[nextIdx]);
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentPhotos.length === 0) return;
    const prevIdx = (lightboxIndex - 1 + currentPhotos.length) % currentPhotos.length;
    setLightboxIndex(prevIdx);
    setLightboxPhoto(currentPhotos[prevIdx]);
  };

  const toggleLike = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedPhotos((prev) => {
      const isLiked = !prev[photoId];
      if (isLiked) {
        onShowToast('사진에 하트를 남겼어요! 💕');
      }
      return { ...prev, [photoId]: isLiked };
    });
  };

  // Admin: Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const newFolderId = await WeddingDataService.addPhotoFolder({
        name: newFolderName.trim(),
        description: newFolderDesc.trim() || newFolderName.trim(),
        icon: 'folder',
      });
      setSelectedFolderId(newFolderId);
      setNewFolderName('');
      setNewFolderDesc('');
      setShowAddFolderModal(false);
      onShowToast('새 사진첩 폴더가 생성되었습니다! 📁');
    } catch {
      onShowToast('폴더 생성에 실패했습니다.');
    }
  };

  // Admin: Add / Upload photo
  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoTitle.trim()) {
      onShowToast('사진 제목을 입력해주세요.');
      return;
    }
    if (!photoFile && !photoUrlInput.trim()) {
      onShowToast('사진 파일이나 이미지 URL을 입력해주세요.');
      return;
    }

    const folderId = photoTargetFolder || selectedFolderId;
    setIsUploading(true);
    try {
      let finalImageUrl = photoUrlInput.trim();
      if (photoFile) {
        // Upload to Firebase Storage
        finalImageUrl = await WeddingDataService.uploadPhotoFile(photoFile);
      }

      await WeddingDataService.addPhoto({
        folderId,
        title: photoTitle.trim(),
        imageUrl: finalImageUrl,
        date: photoDate.trim() || '2025.10.12',
        location: photoLocation.trim() || '웨딩홀',
        caption: photoCaption.trim() || photoTitle.trim(),
      });

      onShowToast('사진이 사진첩에 성공적으로 추가되었습니다! 📷');
      setShowAddPhotoModal(false);
      setPhotoTitle('');
      setPhotoCaption('');
      setPhotoFile(null);
      setPhotoUrlInput('');
    } catch {
      onShowToast('사진 업로드/추가에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // Admin: Delete photo
  const handleConfirmDelete = async () => {
    if (!deleteTargetPhoto) return;
    try {
      await WeddingDataService.deletePhoto(deleteTargetPhoto.id);
      onShowToast('사진이 삭제되었습니다. 🗑️');
      if (lightboxPhoto?.id === deleteTargetPhoto.id) {
        closeLightbox();
      }
      setDeleteTargetPhoto(null);
    } catch {
      onShowToast('사진 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Album Title Header */}
      <div className="retro-box-cream p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📸</span>
          <div>
            <h2 className="font-pixel text-sm sm:text-base font-bold text-[#3B2F2F]">
              {WEDDING_CONFIG.groom.name} & {WEDDING_CONFIG.bride.name}의 사진첩
            </h2>
            <p className="text-[11px] font-body text-[#666666]">
              우리가 함께 걸어온 소중한 순간들
            </p>
          </div>
        </div>
        <div className="text-[11px] font-pixel text-[#2E8BFF] bg-white border border-[#3B2F2F] px-2 py-0.5 rounded shadow-[1px_1px_0_#3B2F2F]">
          총 {photos.length}장의 추억
        </div>
      </div>

      {/* Admin Quick Action Bar (Only visible to admin) */}
      {isAdmin && (
        <div className="bg-[#FFF9DB] border-2 border-[#3B2F2F] p-2.5 rounded-lg shadow-[3px_3px_0_#3B2F2F] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-pixel font-bold text-[#856404]">
            <Sparkles className="w-4 h-4 text-[#FCC419]" />
            <span>사진첩 관리</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddFolderModal(true)}
              className="retro-btn bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] px-2.5 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>+ 새 폴더</span>
            </button>
            <button
              onClick={() => {
                setPhotoTargetFolder(selectedFolderId);
                setShowAddPhotoModal(true);
              }}
              className="retro-btn bg-[#2E8BFF] hover:bg-[#1C74E0] text-white px-2.5 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>+ 사진 업로드</span>
            </button>
          </div>
        </div>
      )}

      {/* Folders List (Cyworld Style Tabs) */}
      <div className="grid grid-cols-3 gap-1.5">
        {folders.map((folder) => {
          const isActive = folder.id === selectedFolderId;
          const count = photos.filter((p) => p.folderId === folder.id).length;
          return (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`retro-btn px-2 py-2 text-left flex flex-col items-center justify-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#2E8BFF] text-white shadow-[2px_2px_0_#3B2F2F]'
                  : 'bg-white hover:bg-[#FAF7F0] text-[#3B2F2F]'
              }`}
            >
              <div className="flex items-center gap-1">
                <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-white fill-white' : 'text-[#E5A93C] fill-[#E5A93C]'}`} />
                <span className="text-xs font-pixel font-bold truncate max-w-[70px]">
                  {folder.name}
                </span>
              </div>
              <span className={`text-[10px] font-pixel mt-0.5 ${isActive ? 'text-blue-100' : 'text-[#888888]'}`}>
                ({count}장)
              </span>
            </button>
          );
        })}
      </div>

      {/* Polaroid Photos Grid (2 or 3 Columns with tilt and retro white borders) */}
      <div className="retro-box p-3 sm:p-4 bg-white space-y-3">
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#dcd1be] pb-2 text-xs font-pixel text-[#666666]">
          <span>📁 {folders.find((f) => f.id === selectedFolderId)?.description || '사진 목록'}</span>
          <span className="text-[#2E8BFF]">사진을 탭하면 크게 볼 수 있어요</span>
        </div>

        {currentPhotos.length === 0 ? (
          <div className="py-12 text-center text-xs font-pixel text-[#888888] space-y-2">
            <p>이 폴더에 등록된 사진이 없습니다.</p>
            {isAdmin && (
              <button
                onClick={() => {
                  setPhotoTargetFolder(selectedFolderId);
                  setShowAddPhotoModal(true);
                }}
                className="retro-btn bg-[#2E8BFF] text-white px-3 py-1 text-xs font-pixel inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>사진 추가하기</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {currentPhotos.map((photo, index) => {
              // Alternating subtle tilt
              const tiltClass = index % 3 === 0 ? '-rotate-1' : index % 3 === 1 ? 'rotate-1' : 'rotate-0';
              const isLiked = likedPhotos[photo.id];

              return (
                <div
                  key={photo.id}
                  onClick={() => openLightbox(photo, index)}
                  className={`group relative bg-white border-2 border-[#3B2F2F] p-1.5 pb-2.5 rounded shadow-[3px_3px_0_#3B2F2F] hover:shadow-[5px_5px_0_#2E8BFF] hover:rotate-0 transition-all cursor-pointer ${tiltClass}`}
                >
                  {/* Polaroid Tape/Pin Accent */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-[#f3e7c4]/80 border-t border-b border-[#3B2F2F]/20 rounded-xs z-10" />

                  {/* Image Container */}
                  <div className="w-full aspect-square bg-[#ECE3D2] border border-[#d8cdb8] rounded-xs overflow-hidden relative">
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                    </div>

                    {/* Like Heart Button */}
                    <button
                      onClick={(e) => toggleLike(photo.id, e)}
                      className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-white/90 border border-[#3B2F2F] flex items-center justify-center hover:scale-110 transition-transform shadow-xs cursor-pointer"
                      title="좋아요"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isLiked ? 'text-[#F4A6B7] fill-[#F4A6B7]' : 'text-[#888888]'
                        }`}
                      />
                    </button>

                    {/* Admin Delete Icon directly on thumbnail */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetPhoto(photo);
                        }}
                        className="absolute bottom-1.5 right-1.5 z-10 w-6 h-6 rounded bg-[#E03131] text-white flex items-center justify-center border border-[#3B2F2F] hover:scale-110 shadow-xs cursor-pointer"
                        title="사진 삭제 (관리자)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Polaroid Bottom Caption Area */}
                  <div className="mt-2 px-1 text-center space-y-0.5">
                    <p className="font-pixel text-xs text-[#3B2F2F] font-bold truncate">
                      {photo.title}
                    </p>
                    <p className="font-pixel text-[10px] text-[#888888]">
                      {photo.date}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxPhoto && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 animate-fadeIn"
        >
          {/* Modal Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="retro-box bg-white max-w-md w-full p-3 sm:p-4 space-y-3 relative shadow-[6px_6px_0_#2E8BFF]"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2 text-xs font-pixel">
              <span className="font-bold text-[#3B2F2F] flex items-center gap-1.5 truncate max-w-[200px]">
                <span>📷</span>
                <span>{lightboxPhoto.title}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#888888]">
                  {lightboxIndex + 1} / {currentPhotos.length}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setDeleteTargetPhoto(lightboxPhoto)}
                    className="text-[#E03131] hover:underline flex items-center gap-0.5 text-[11px] font-pixel cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>삭제</span>
                  </button>
                )}
                <button
                  onClick={closeLightbox}
                  className="font-bold text-sm px-1.5 py-0.5 hover:text-[#E03131] cursor-pointer"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Photo Viewport with Left/Right Buttons */}
            <div className="relative aspect-[4/3] bg-black/5 rounded border-2 border-[#3B2F2F] overflow-hidden flex items-center justify-center">
              <img
                src={lightboxPhoto.imageUrl}
                alt={lightboxPhoto.title}
                className="w-full h-full object-contain select-none"
              />

              {/* Prev Button */}
              {currentPhotos.length > 1 && (
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border-2 border-[#3B2F2F] flex items-center justify-center hover:bg-white text-[#3B2F2F] shadow-[2px_2px_0_#3B2F2F] active:translate-x-0.5 cursor-pointer"
                  title="이전 사진"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Next Button */}
              {currentPhotos.length > 1 && (
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border-2 border-[#3B2F2F] flex items-center justify-center hover:bg-white text-[#3B2F2F] shadow-[2px_2px_0_#3B2F2F] active:translate-x-0.5 cursor-pointer"
                  title="다음 사진"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Photo Meta and Caption */}
            <div className="bg-[#FAF7F0] border border-[#3B2F2F] rounded p-2.5 space-y-1 text-xs">
              <div className="flex items-center justify-between font-pixel text-[11px] text-[#666666]">
                <span>📅 {lightboxPhoto.date}</span>
                <span>📍 {lightboxPhoto.location}</span>
              </div>
              <p className="font-body text-[#3B2F2F] text-xs pt-1 leading-relaxed">
                {lightboxPhoto.caption}
              </p>
            </div>

            {/* Close Button */}
            <div className="flex gap-2">
              <button
                onClick={(e) => toggleLike(lightboxPhoto.id, e)}
                className="retro-btn flex-1 bg-[#FFF0F4] hover:bg-[#fee2e9] text-[#3B2F2F] py-2 text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    likedPhotos[lightboxPhoto.id]
                      ? 'text-[#F4A6B7] fill-[#F4A6B7]'
                      : 'text-[#888888]'
                  }`}
                />
                <span>
                  {likedPhotos[lightboxPhoto.id] ? '하트 완료!' : '하트 남기기'}
                </span>
              </button>
              <button
                onClick={closeLightbox}
                className="retro-btn bg-[#3B2F2F] text-white py-2 px-5 text-xs font-pixel cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal: Create Folder */}
      {showAddFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3 shadow-[6px_6px_0_#3B2F2F]">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <h3 className="font-pixel text-sm font-bold text-[#3B2F2F] flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-[#E5A93C]" />
                <span>새 폴더 만들기</span>
              </h3>
              <button onClick={() => setShowAddFolderModal(false)} className="text-gray-500 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-xs font-pixel text-[#3B2F2F] mb-1">폴더 이름 *</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="예: 신혼여행, 일상"
                  className="w-full border-2 border-[#3B2F2F] p-2 text-xs font-body rounded focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-pixel text-[#3B2F2F] mb-1">폴더 설명</label>
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="예: 발리에서의 행복했던 순간들"
                  className="w-full border-2 border-[#3B2F2F] p-2 text-xs font-body rounded focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFolderModal(false)}
                  className="retro-btn flex-1 bg-gray-200 py-2 text-xs font-pixel"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="retro-btn flex-1 bg-[#2E8BFF] text-white py-2 text-xs font-pixel"
                >
                  폴더 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Modal: Upload / Add Photo */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="retro-box bg-white max-w-md w-full p-4 space-y-3 shadow-[6px_6px_0_#3B2F2F] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <h3 className="font-pixel text-sm font-bold text-[#3B2F2F] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#2E8BFF]" />
                <span>사진 업로드 (Firebase Storage)</span>
              </h3>
              <button onClick={() => setShowAddPhotoModal(false)} className="text-gray-500 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadPhoto} className="space-y-3">
              <div>
                <label className="block text-xs font-pixel text-[#3B2F2F] mb-1">저장할 폴더</label>
                <select
                  value={photoTargetFolder}
                  onChange={(e) => setPhotoTargetFolder(e.target.value)}
                  className="w-full border-2 border-[#3B2F2F] p-2 text-xs font-pixel rounded bg-white"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* File upload or URL input */}
              <div className="bg-[#FAF7F0] p-2.5 border border-[#3B2F2F] rounded space-y-2">
                <div>
                  <label className="block text-xs font-pixel text-[#3B2F2F] mb-1 font-bold">
                    1. 파일 직접 업로드 (추천)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPhotoFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs font-pixel text-[#3B2F2F]"
                  />
                  {photoFile && (
                    <p className="text-[10px] font-pixel text-[#2E8BFF] mt-1">
                      선택된 파일: {photoFile.name} ({(photoFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="border-t border-[#d8cdb8] pt-2">
                  <label className="block text-xs font-pixel text-[#3B2F2F] mb-1 font-bold">
                    2. 또는 외부 이미지 URL 입력
                  </label>
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder="https://... (파일이 없을 때만 사용)"
                    className="w-full border border-[#3B2F2F] p-1.5 text-xs font-body rounded bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-pixel text-[#3B2F2F] mb-1">사진 제목 *</label>
                <input
                  type="text"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  placeholder="예: 제주도 해변가에서"
                  className="w-full border-2 border-[#3B2F2F] p-2 text-xs font-body rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-pixel text-[#3B2F2F] mb-1">날짜</label>
                  <input
                    type="text"
                    value={photoDate}
                    onChange={(e) => setPhotoDate(e.target.value)}
                    placeholder="2025.10.12"
                    className="w-full border-2 border-[#3B2F2F] p-2 text-xs font-body rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-pixel text-[#3B2F2F] mb-1">위치/장소</label>
                  <input
                    type="text"
                    value={photoLocation}
                    onChange={(e) => setPhotoLocation(e.target.value)}
                    placeholder="예: 제주도 협재"
                    className="w-full border-2 border-[#3B2F2F] p-2 text-xs font-body rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-pixel text-[#3B2F2F] mb-1">추억 한 줄 (설명)</label>
                <textarea
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="함께 보았던 노을빛 바다..."
                  rows={2}
                  className="w-full border-2 border-[#3B2F2F] p-2 text-xs font-body rounded resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPhotoModal(false)}
                  disabled={isUploading}
                  className="retro-btn flex-1 bg-gray-200 py-2 text-xs font-pixel"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="retro-btn flex-1 bg-[#2E8BFF] text-white py-2 text-xs font-pixel flex items-center justify-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>업로드 중...</span>
                    </>
                  ) : (
                    <span>사진 등록</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetPhoto && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="retro-box bg-white max-w-xs w-full p-4 space-y-3 text-center shadow-[6px_6px_0_#3B2F2F]">
            <div className="text-3xl">🗑️</div>
            <h4 className="font-pixel text-sm font-bold text-[#3B2F2F]">사진을 삭제할까요?</h4>
            <p className="text-xs font-body text-[#666666]">
              "{deleteTargetPhoto.title}" 사진이 영구히 삭제됩니다.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetPhoto(null)}
                className="retro-btn flex-1 bg-gray-200 py-2 text-xs font-pixel cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                className="retro-btn flex-1 bg-[#E03131] text-white py-2 text-xs font-pixel cursor-pointer"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
