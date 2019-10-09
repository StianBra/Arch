var aTxt = [

"langKey_helpedit","langKey_helpslideshow","langKey_helpsearch","langKey_helpsettings","langKey_helpvideo",
"alleanzeigen","wunschliste","shops","filter","home","search","noentries","ratetext","idbegin","idend","idedit","iddel","deffolder","idbeginf","idendf","ideditf","iddelf","langkey_preis","langkey_bilder","langkey_videos","langkey_maps","langkey_translate","name","url","searchurl","searchurl2","apply","cancel","ok","done","apps","downloads","resethelp","resethelp2","resettheme",
"langKey_helptoggle","langKey_helpdrag","videolist","supported","original","close",
"noborder","langKey_editToplinks","langKey_delall","langKey_addfolder","langKey_addToplink","langKey_settings","langKey_firststart",
"langKey_checknodefaults","langKey_bkcolor","langKey_textcolor","langKey_bordercolor","langKey_trans","langKey_border","langKey_sync",
"langKey_country","langKey_de","langKey_en",
"theme100","theme101","theme102","theme102","theme103","theme104","theme105","theme106","theme107","theme108","theme109","theme110","theme111","theme112","theme113"

]


var t = {};
for ( var i = 0; i <aTxt.length;i++)
	t[aTxt[i]] = chrome.i18n.getMessage(aTxt[i]);

