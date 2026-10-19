import { useState, useRef, useEffect } from 'react';
import { FORM_TAGS } from '../data/sampleData';
import { createProblem } from '../services/problemService';

export default function PostForm({ currentUser, onProblemPosted }) {
  const [showDetail, setShowDetail] = useState(false);
  const [problemText, setProblemText] = useState('');
  const [tag, setTag] = useState('Websites');
  const [name, setName] = useState('');
  const [product, setProduct] = useState('');
  const [frequency, setFrequency] = useState('');
  const [workaround, setWorkaround] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Web Speech API state and refs
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const initialTextRef = useRef('');

  // Feature detection: Web Speech API
  const hasSpeech =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleSpeak = () => {
    if (!hasSpeech) return;

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-IN';

      initialTextRef.current = problemText;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const base = initialTextRef.current;
        const separator = base && !base.endsWith(' ') ? ' ' : '';
        const combined = base ? `${base}${separator}${transcript}` : transcript;
        setProblemText(combined.slice(0, 600));
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!problemText.trim()) return;

    // Stop listening if speech was ongoing
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setConfirmationMessage(null);

    try {
      const newProblem = await createProblem({
        text: problemText,
        tag,
        displayName: name,
        product,
        frequency,
        workaround,
        currentUser,
      });

      // Clear form
      setProblemText('');
      setName('');
      setProduct('');
      setFrequency('');
      setWorkaround('');
      setShowDetail(false);

      // Confirmation line for anonymous users as required in product.md
      const isAnonymous = currentUser?.isAnonymous ?? true;
      if (isAnonymous) {
        setConfirmationMessage(
          'Posted. It is saved in this browser only. Log in to keep it for good.'
        );
      } else {
        setConfirmationMessage('Posted successfully.');
      }

      if (onProblemPosted) {
        onProblemPosted(newProblem);
      }
    } catch (err) {
      console.error('Failed to post problem:', err);
      if (err.message && err.message.includes('permission-denied')) {
        setErrorMessage(
          'Please wait 30 seconds between posts, or verify your connection.'
        );
      } else {
        setErrorMessage(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <label className="form-group">
        <span className="field-label bold">What's the problem?</span>
        <textarea
          rows="3"
          className="problem-textarea"
          placeholder="Describe something frustrating, broken, missing, or unnecessarily difficult about a technology you use..."
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          maxLength={600}
          required
        />
      </label>

      <div className="form-action-row">
        {hasSpeech && (
          <button
            type="button"
            className={`secondary-button speak-button ${isListening ? 'listening' : ''}`}
            onClick={toggleSpeak}
          >
            {isListening ? 'Listening, tap to stop' : 'Speak'}
          </button>
        )}

        <label className="form-group inline-group">
          <span className="field-label muted">Category</span>
          <select
            className="input-field select-field"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            {FORM_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="form-group inline-group flex-grow">
          <span className="field-label muted">Name (optional)</span>
          <input
            type="text"
            className="input-field"
            placeholder="Anonymous"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
        </label>

        <button
          type="submit"
          className="primary-button drop-button"
          disabled={isSubmitting || !problemText.trim()}
        >
          {isSubmitting ? 'Dropping...' : 'Drop it'}
        </button>
      </div>

      <div className="form-extra-toggle">
        <button
          type="button"
          className="link-button"
          onClick={() => setShowDetail(!showDetail)}
        >
          {showDetail
            ? 'Hide extra detail'
            : 'Add more detail (product/tool, how often, workaround)'}
        </button>
      </div>

      {showDetail && (
        <div className="detail-fields">
          <div className="detail-row">
            <label className="form-group flex-1">
              <span className="field-label muted">Product or tool (optional)</span>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Chrome, Figma, IRCTC, Notion"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                maxLength={80}
              />
            </label>

            <label className="form-group flex-1">
              <span className="field-label muted">How often</span>
              <select
                className="input-field select-field"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="">Select frequency</option>
                <option value="Every time I use it">Every time I use it</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Rarely">Rarely</option>
              </select>
            </label>
          </div>

          <label className="form-group">
            <span className="field-label muted">What you do today (optional)</span>
            <input
              type="text"
              className="input-field"
              placeholder="Your current workaround or what you do today..."
              value={workaround}
              onChange={(e) => setWorkaround(e.target.value)}
              maxLength={300}
            />
          </label>
        </div>
      )}

      {errorMessage && <p className="form-error-line">{errorMessage}</p>}

      {confirmationMessage && (
        <p className="posted-confirmation-line">
          {confirmationMessage}{' '}
          <a href="#login" className="claim-link">
            Log in
          </a>
        </p>
      )}

      <p className="form-helper-note">
        No solution required. Just tell us what isn't working. Your everyday frustrations could inspire the next useful tool, website, or application.
      </p>

      <p className="login-note">
        You can post without logging in. But you may lose access to your post if you close this window or clear your browser. Log in first to keep it and to get the chance to become a Contributor.
      </p>
    </form>
  );
}
