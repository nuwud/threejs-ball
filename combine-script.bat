@echo off
echo Combining files...
copy /b quick-fix.js + quick-fix-part2.js + quick-fix-part3.js + quick-fix-part4.js + quick-fix-part5.js + quick-fix-complete.js quick-fix-combined.js
echo Done! The combined file is now available as quick-fix-combined.js
echo You should replace quick-fix.html to use quick-fix-combined.js instead of quick-fix.js
pause
