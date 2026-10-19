import { useState } from 'react';
import { resizeImageToSquare } from '../utils/imageResize';
import { claimContributor } from '../services/contributorService';

export default function ClaimContributorModal({
  problem,
  currentUser,
  onClose,
  onClaimSuccess,
  onNavigateToLogin,
}) {
  const [name, setName] = useState(
    problem.displayName || problem.authorName || ''
  );
  const [photoData, setPhotoData] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const isAnonymous = currentUser?.isAnonymous ?? true;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resizedDataUrl = await resizeImageToSquare(file, 300, 0.7);
      setPhotoData(resizedDataUrl);
      setPreviewUrl(resizedDataUrl);
      setErrorMessage(null);
    } catch (err) {
      console.error('Failed to process image:', err);
      setErrorMessage(err.message || 'Could not process photo.');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoData(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isAnonymous) {
      onClose();
      onNavigateToLogin();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const contributor = await claimContributor({
        problemId: problem.id,
        name: name.trim(),
        photoData,
        currentUser,
        problemTitle: problem.text,
        meTooCount: problem.meTooCount,
      });

      if (onClaimSuccess) {
        onClaimSuccess(contributor);
      }
      onClose();
    } catch (err) {
      console.error('Claim failed:', err);
      setErrorMessage(err.message || 'Could not submit contributor record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Join Contributors</h2>
        <p className="modal-subtext">
          Your problem reached 10+ upvotes! Add your display name and optional photo to be featured in the Contributors section.
        </p>

        {isAnonymous ? (
          <div className="modal-anon-warning">
            <p className="warning-text">
              You are currently signed in anonymously. You must log in to join Contributors.
            </p>
            <div className="modal-button-row">
              <button
                type="button"
                className="primary-button flex-1"
                onClick={() => {
                  onClose();
                  onNavigateToLogin();
                }}
              >
                Log in to claim
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="claim-form">
            <label className="form-group">
              <span className="field-label bold">Display name</span>
              <input
                type="text"
                className="input-field"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                required
              />
            </label>

            <div className="form-group">
              <span className="field-label bold">Photo (optional)</span>
              <div className="photo-upload-row">
                {previewUrl ? (
                  <div className="photo-preview-wrap">
                    <img
                      src={previewUrl}
                      alt="Contributor preview"
                      className="photo-preview-img"
                    />
                    <button
                      type="button"
                      className="link-button remove-photo-link"
                      onClick={handleRemovePhoto}
                    >
                      Remove photo
                    </button>
                  </div>
                ) : (
                  <div className="photo-empty-placeholder">
                    <span>{name.trim() ? name.trim()[0].toUpperCase() : 'Photo'}</span>
                  </div>
                )}

                <div className="photo-input-meta">
                  <input
                    type="file"
                    id="contributor-photo-input"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="file-input-hidden"
                  />
                  <label
                    htmlFor="contributor-photo-input"
                    className="secondary-button photo-choose-label"
                  >
                    {previewUrl ? 'Change photo' : 'Choose photo'}
                  </label>
                  <span className="field-meta-note">
                    Square 300px crop saved locally in the record.
                  </span>
                </div>
              </div>
            </div>

            {errorMessage && <p className="form-error-line">{errorMessage}</p>}

            <div className="modal-button-row">
              <button
                type="submit"
                className="primary-button flex-1"
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting ? 'Joining...' : 'Join Contributors'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
