import axios from 'axios';

const PID_OPTIONS = `<PidOptions ver="1.0">
  <Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="10000" otp="" wadh="" posh="" env="P" />
</PidOptions>`;

export const biometricService = {
  captureFingerprint: async (): Promise<string> => {
    // Standard RD Service ports for Morpho and other devices
    const ports = [11100, 11101, 11102];
    
    for (let port of ports) {
      try {
        const url = `http://127.0.0.1:${port}/rd/capture`;
        // RD service requires HTTP CAPTURE or POST method
        const response = await fetch(url, {
          method: 'CAPTURE', // Typical for RD Service
          headers: {
            'Content-Type': 'text/xml'
          },
          body: PID_OPTIONS
        });

        if (response.ok) {
          const xmlResponse = await response.text();
          
          // Basic check to see if the capture was successful (errCode="0")
          if (xmlResponse.includes('errCode="0"')) {
            return xmlResponse;
          } else {
            console.error('Biometric capture error:', xmlResponse);
            throw new Error('Capture failed. Please try again or check the scanner.');
          }
        }
      } catch (e: any) {
        // If fetch fails (e.g. port not active), continue to next port
        console.log(`Port ${port} not active or failed:`, e.message);
      }
    }
    
    throw new Error('RD Service not found. Please ensure Morpho RD Service is installed and running.');
  }
};
