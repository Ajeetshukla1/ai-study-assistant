'use client';

import { useRef, useEffect, useState } from 'react';

export default function CameraTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Click to start camera');
  const [streamInfo, setStreamInfo] = useState<string>('');

  const startCamera = async () => {
    try {
      setStatus('Requesting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });

      setStatus('Camera stream obtained');
      console.log('Stream:', stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setStatus('Video metadata loaded');
          console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
          
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                setStatus('Video playing!');
                setStreamInfo(`${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
              })
              .catch(err => {
                console.error('Play failed:', err);
                setStatus('Play failed: ' + err.message);
              });
          }
        };
      }
      
    } catch (error) {
      console.error('Camera error:', error);
      setStatus('Error: ' + (error as Error).message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStatus('Camera stopped');
    setStreamInfo('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎥 Camera Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={startCamera}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Start Camera
        </button>
        
        <button 
          onClick={stopCamera}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Stop Camera
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
        {streamInfo && <div><strong>Video:</strong> {streamInfo}</div>}
      </div>

      {/* Simple video element with inline styles */}
      <div 
        style={{
          border: '2px solid #333',
          borderRadius: '8px',
          overflow: 'hidden',
          width: '640px',
          height: '480px',
          backgroundColor: '#000',
          position: 'relative'
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            backgroundColor: '#000'
          }}
          autoPlay
          playsInline
          muted
        />
        
        {/* Overlay to show if video is really there */}
        <div 
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(0,255,0,0.8)',
            color: 'black',
            padding: '5px 10px',
            borderRadius: '3px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          VIDEO ELEMENT
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ul>
          <li>Click "Start Camera" and allow camera access</li>
          <li>You should see your video feed in the black rectangle above</li>
          <li>Green overlay confirms the video element is present</li>
          <li>Check browser console for detailed logs</li>
        </ul>
      </div>

      {/* Debug info */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Debug Info:</h3>
        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        <p><strong>WebRTC Support:</strong> {navigator.mediaDevices ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Location:</strong> {window.location.href}</p>
      </div>
    </div>
  );
}