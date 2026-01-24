const axios = require('axios');

/**
 * VATSIM Service
 * Handles integration with VATSIM network for real-time flight tracking
 * Observes publicly available data, never injects traffic
 */
class VatsimService {
  constructor() {
    this.dataUrl = process.env.VATSIM_DATA_URL || 'https://data.vatsim.net/v3/vatsim-data.json';
    this.pollInterval = parseInt(process.env.VATSIM_POLL_INTERVAL) || 15000;
    this.lastUpdate = null;
    this.cachedData = null;
  }

  /**
   * Fetch current VATSIM network data
   */
  async fetchData() {
    try {
      const response = await axios.get(this.dataUrl);
      this.cachedData = response.data;
      this.lastUpdate = new Date();
      return response.data;
    } catch (error) {
      console.error('Error fetching VATSIM data:', error.message);
      throw error;
    }
  }

  /**
   * Find a specific flight by callsign
   */
  async findFlightByCallsign(callsign) {
    if (!this.cachedData) {
      await this.fetchData();
    }

    const pilot = this.cachedData.pilots.find(
      p => p.callsign.toUpperCase() === callsign.toUpperCase()
    );

    return pilot || null;
  }

  /**
   * Get all active flights matching our airline callsigns
   */
  async getActiveFlights(callsigns = []) {
    if (!this.cachedData) {
      await this.fetchData();
    }

    return this.cachedData.pilots.filter(pilot =>
      callsigns.some(cs => pilot.callsign.toUpperCase().startsWith(cs.toUpperCase()))
    );
  }

  /**
   * Start polling VATSIM data at regular intervals
   */
  startPolling(callback) {
    this.pollingInterval = setInterval(async () => {
      try {
        const data = await this.fetchData();
        if (callback) {
          callback(data);
        }
      } catch (error) {
        console.error('Polling error:', error.message);
      }
    }, this.pollInterval);

    console.log(`✓ VATSIM polling started (interval: ${this.pollInterval}ms)`);
  }

  /**
   * Stop polling VATSIM data
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      console.log('✓ VATSIM polling stopped');
    }
  }
}

module.exports = new VatsimService();