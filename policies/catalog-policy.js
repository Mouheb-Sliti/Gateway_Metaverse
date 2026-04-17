module.exports = {
    name: 'catalog-policy',
    policy: (actionParams) => {
        return (req, res, next) => {
            const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
            console.log(`Catalog Policy: Processing request for ${fullUrl}`);
            console.log(`Request original url: ${req.originalUrl}`);
            next();
        };
    },
    schema: {
        $id: 'catalog-policy',
        type: 'object',
        properties: {
            channel: {
                type: 'string',
                enum: ['web', 'mobile', 'metaverse'],
                default: 'metaverse'
            }
        }
    }
}