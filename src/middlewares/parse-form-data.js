const parseFormData = (req, res, next) => {
    // Debug request files
    if (req.files) {
        console.log('Files received:', Object.keys(req.files).map(key => ({
            fieldname: key,
            files: req.files[key].map(f => f.originalname)
        })));
    }
    
    if (req.body) {
        Object.keys(req.body).forEach((key) => {
            // Skip empty fields
            if (!req.body[key]) return;
            
            try {
                // Handle properties field specially - make sure it's valid JSON
                if (key === 'properties' && typeof req.body[key] === 'string') {
                    console.log(`Parsing properties field: ${req.body[key]}`);
                    
                    if (req.body[key].trim() === '') {
                        // Default to empty object if properties is an empty string
                        req.body[key] = {};
                    } else {
                        req.body[key] = JSON.parse(req.body[key]);
                    }
                    
                    console.log(`Parsed properties:`, req.body[key]);
                } 
                // Try to parse other fields as JSON if they look like JSON
                else if (typeof req.body[key] === 'string' && 
                        (req.body[key].trim().startsWith('{') || 
                         req.body[key].trim().startsWith('['))) {
                    console.log(`Attempting to parse ${key} as JSON: ${req.body[key]}`);
                    req.body[key] = JSON.parse(req.body[key]);
                    console.log(`Successfully parsed ${key}:`, req.body[key]);
                }
            } catch (e) {
                console.log(`Could not parse ${key} as JSON, keeping as string: ${e.message}`);
                // Keep as string if it's not valid JSON
            }
        });
    }
    
    console.log('Final parsed body:', req.body);
    next();
};

module.exports = parseFormData;
