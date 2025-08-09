/**
 * LRC (Longitudinal Redundancy Check) Calculator
 * Used for ECR message integrity verification
 */
export class LRCCalculator {
  /**
   * Calculate LRC checksum for a message
   * @param {string} message - Message to calculate LRC for
   * @returns {number} LRC checksum value
   */
  static calculate(message) {
    let lrc = 0;
    
    // XOR all characters in the message
    for (let i = 0; i < message.length; i++) {
      lrc ^= message.charCodeAt(i);
    }
    
    return lrc;
  }
  
  /**
   * Calculate LRC for a byte array
   * @param {Uint8Array} bytes - Byte array to calculate LRC for
   * @returns {number} LRC checksum value
   */
  static calculateFromBytes(bytes) {
    let lrc = 0;
    
    for (let i = 0; i < bytes.length; i++) {
      lrc ^= bytes[i];
    }
    
    return lrc;
  }
  
  /**
   * Verify LRC checksum for received message
   * @param {string} message - Complete message including LRC
   * @returns {boolean} True if LRC is valid
   */
  static verify(message) {
    if (message.length < 2) {
      return false;
    }
    
    // Extract message content (excluding STX at start and LRC at end)
    const stxIndex = message.indexOf('\x02');
    const etxIndex = message.indexOf('\x03');
    
    if (stxIndex === -1 || etxIndex === -1) {
      return false;
    }
    
    // Message content from after STX to including ETX
    const messageContent = message.substring(stxIndex + 1, etxIndex + 1);
    const receivedLRC = message.charCodeAt(message.length - 1);
    const calculatedLRC = this.calculate(messageContent);
    
    return receivedLRC === calculatedLRC;
  }
  
  /**
   * Verify LRC for byte array message
   * @param {Uint8Array} bytes - Complete message bytes including LRC
   * @returns {boolean} True if LRC is valid
   */
  static verifyBytes(bytes) {
    if (bytes.length < 4) {
      return false;
    }
    
    let stxIndex = -1;
    let etxIndex = -1;
    
    // Find STX and ETX positions
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0x02) {
        stxIndex = i;
      } else if (bytes[i] === 0x03 && stxIndex !== -1) {
        etxIndex = i;
        break;
      }
    }
    
    if (stxIndex === -1 || etxIndex === -1) {
      return false;
    }
    
    // Calculate LRC for message content (from after STX to including ETX)
    const messageBytes = bytes.slice(stxIndex + 1, etxIndex + 1);
    const receivedLRC = bytes[etxIndex + 1];
    const calculatedLRC = this.calculateFromBytes(messageBytes);
    
    return receivedLRC === calculatedLRC;
  }
  
  /**
   * Convert string to hex representation for debugging
   * @param {string} str - String to convert
   * @returns {string} Hex representation
   */
  static stringToHex(str) {
    return Array.from(str)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }
  
  /**
   * Convert bytes to hex representation for debugging
   * @param {Uint8Array} bytes - Bytes to convert
   * @returns {string} Hex representation
   */
  static bytesToHex(bytes) {
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }
}

