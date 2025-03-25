// Small script to check if quick-fix-complete.js is complete
const fs = require('fs');
const path = require('path');

// Directory where the parts are located
const dir = __dirname;

// Read all the parts
try {
    console.log('Reading file parts...');
    
    // Read the quick-fix.js file
    const part0 = fs.readFileSync(path.join(dir, 'quick-fix.js'), 'utf8');
    console.log('Part 0 (quick-fix.js) length:', part0.length);
    
    // Read all the part files
    const part2 = fs.readFileSync(path.join(dir, 'quick-fix-part2.js'), 'utf8');
    console.log('Part 2 length:', part2.length);
    
    const part3 = fs.readFileSync(path.join(dir, 'quick-fix-part3.js'), 'utf8');
    console.log('Part 3 length:', part3.length);
    
    const part4 = fs.readFileSync(path.join(dir, 'quick-fix-part4.js'), 'utf8');
    console.log('Part 4 length:', part4.length);
    
    const part5 = fs.readFileSync(path.join(dir, 'quick-fix-part5.js'), 'utf8');
    console.log('Part 5 length:', part5.length);
    
    const complete = fs.readFileSync(path.join(dir, 'quick-fix-complete.js'), 'utf8');
    console.log('Complete file length:', complete.length);
    
    // Combine them (assuming no overlap)
    let combined = '';
    
    // Check if part0 looks incomplete
    if (part0.includes('SoundSynthesizer') && part0.length < 10000) {
        console.log('Part 0 looks incomplete, combining parts...');
        combined = part0 + part2 + part3 + part4 + part5 + complete;
    } else {
        console.log('Part 0 might be complete already, using as is');
        combined = part0;
    }
    
    console.log('Combined length:', combined.length);
    
    // Write the combined file
    fs.writeFileSync(path.join(dir, 'quick-fix-final.js'), combined, 'utf8');
    console.log('Successfully wrote combined file: quick-fix-final.js');
    
    // Copy the file to quick-fix.js as well
    fs.writeFileSync(path.join(dir, 'quick-fix.js'), combined, 'utf8');
    console.log('Successfully copied to quick-fix.js');
    
} catch (err) {
    console.error('Error:', err);
}
