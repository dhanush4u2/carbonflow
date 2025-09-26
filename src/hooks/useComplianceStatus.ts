import { useState, useEffect } from 'react';
import { useMonthlyEmissions } from './monthlyEmissionsHook'; // 1. Import your data-fetching hook

/**
 * A custom hook that uses live data to determine the current compliance status.
 * It encapsulates the data fetching and logic, keeping components clean.
 */
export const useComplianceStatus = () => {
  // State for the compliance status, includes level, message, and details.
  const [status, setStatus] = useState({ 
    level: 'loading', 
    message: 'Checking...', 
    details: 'Fetching latest emissions data...' 
  });

  // 2. Call your custom hook to get the latest emissions data.
  const { emissionsData, loading, error } = useMonthlyEmissions();

  useEffect(() => {
    // 3. Update the status based on the state of the data hook.
    if (loading) {
      setStatus({ 
        level: 'loading', 
        message: 'Checking...', 
        details: 'Fetching latest emissions data...' 
      });
      return; // Exit early while data is loading.
    }

    if (error) {
      setStatus({
        level: 'danger',
        message: 'Error',
        details: 'Could not fetch emissions data.'
      });
      return; // Exit early if there was an error.
    }

    if (emissionsData) {
      // 4. Perform the compliance calculation with the live data.
      const { current_year_emissions, target_emissions } = emissionsData;
      const percentageOver = ((current_year_emissions - target_emissions) / target_emissions) * 100;

      if (current_year_emissions <= target_emissions) {
        setStatus({
          level: 'compliant',
          message: 'Compliant',
          details: 'Emissions are within regulatory limits.'
        });
      } else if (percentageOver <= 10) { // Example threshold: within 10% over
        setStatus({
          level: 'warning',
          message: 'At Risk',
          details: `Emissions are ${percentageOver.toFixed(1)}% over target.`
        });
      } else { // More than 10% over the target
        setStatus({
          level: 'danger',
          message: 'Action Required',
          details: `Emissions are ${percentageOver.toFixed(1)}% over target.`
        });
      }
    } else {
      // Handle the case where there is no data for the user yet.
      setStatus({
        level: 'compliant', // Or 'warning' if you prefer
        message: 'No Data',
        details: 'No emissions data found for this month.'
      });
    }
    // 5. Rerun this logic whenever the data, loading, or error state changes.
  }, [emissionsData, loading, error]); 

  return status;
};
