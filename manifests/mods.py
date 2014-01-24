#!/usr/bin/python

from lxml import etree
import json, sys
import urllib2

modsNS = 'http://www.loc.gov/mods/v3'

ALLNS = {'mods':modsNS}
imageHash = {}

def main(data, outputIdentifier):
	dom = etree.XML(data)

	imageUriBase = "http://ids.lib.harvard.edu/ids/iiif/"
	imageUriSuffix = "/full/full/full/native"
	manifestUriBase = "http://ids.lib.harvard.edu/iiif/metadata/"
	serviceBase = imageUriBase
	profileLevel = "http://library.stanford.edu/iiif/image-api/1.1/conformance.html#level1"

	manifestLabel = dom.xpath('/mods:mods/mods:titleInfo/mods:title/text()', namespaces=ALLNS)[0]
	type = dom.xpath('/mods:mods/mods:typeOfResource/text()', namespaces=ALLNS)[0]
	genres = dom.xpath('/mods:mods/mods:genre/text()', namespaces=ALLNS)

	if "handscroll" in genres:
		viewingHint = "continuous"
	else:
		# XXX Put in other mappings here
		viewingHint = "individuals"

	identifier = dom.xpath('/mods:mods/mods:identifier/text()', namespaces=ALLNS)[0]
	identifierType = dom.xpath('/mods:mods/mods:identifier/@type', namespaces=ALLNS)[0]

	#manifestUriBase += "%s/%s/" % (identifierType, identifier)
	manifestUriBase += "%s/" % (outputIdentifier)

	images = dom.xpath('/mods:mods/mods:location/mods:url[@displayLabel="Full Image"]/text()', namespaces=ALLNS)

	print images

	canvasInfo = []
	for (counter, im) in enumerate(images):
		info = {}
		info['label'] = str(counter+1)
		response = urllib2.urlopen(im)
		ids_url = response.geturl()
		image_id = ids_url[ids_url.rfind('/')+1:]
		info['image'] = image_id
		canvasInfo.append(info)

	mfjson = {
		"@context":"http://www.shared-canvas.org/ns/context.json",
		"@id": manifestUriBase + "manifest.json",
		"@type":"sc:Manifest",
		"label":manifestLabel,
		"attribution":"Provided by Harvard University",
		"viewingHint":viewingHint,
		"sequences": [
			{
				"@id": manifestUriBase + "sequence/normal.json",
				"@type": "sc:Sequence",
			}
		]
	}

	canvases = []

	for cvs in canvasInfo:
		cvsjson = {
			"@id": manifestUriBase + "canvas/canvas-%s.json" % cvs['image'],
			"@type": "sc:Canvas",
			"label": cvs['label'],
			"resources": [
				{
					"@id":manifestUriBase+"annotation/anno-%s.json" % cvs['image'],
					"@type": "oa:Annotation",
					"motivation": "sc:painting",
					"resource": {
						"@id": imageUriBase + cvs['image'] + imageUriSuffix,
						"@type": "dcterms:Image",
						"format":"image/jpeg",
						"service": { 
						  "@id": imageUriBase + cvs['image'],
						  "profile": profileLevel
						},
					},
					"on": manifestUriBase + "canvas/canvas-%s.json" % cvs['image']
				}
			]
		}
		canvases.append(cvsjson)

	mfjson['sequences'][0]['canvases'] = canvases
	output = json.dumps(mfjson, indent=4, sort_keys=True)
	return output

if __name__ == "__main__":
	if (len(sys.argv) < 3):
		sys.stderr.write('not enough args\n')
		sys.stderr.write('usage: mods.py input manifest_identifier\n')
		sys.exit(0)

	inputfile = sys.argv[1]
	outputIdentifier = sys.argv[2]
	outputfile = outputIdentifier +  ".json"
	isDrs1 = True; # add functionality for drs2

	fh = file(inputfile)
	data = fh.read()
	fh.close()

	output = main(data, outputIdentifier)
	fh = file(outputfile, 'w')
	fh.write(output)
	fh.close()