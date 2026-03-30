import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface LocationPickerProps {
    value: string;
    lat?: number;
    lng?: number;
    onChange: (address: string, lat?: number, lng?: number) => void;
}

const LocationPicker = ({ value, lat, lng, onChange }: LocationPickerProps) => {
    const [loading, setLoading] = useState(false);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // In a real app, we would use reverse geocoding here to get the address
                const simulatedAddress = `Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
                onChange(simulatedAddress, latitude, longitude);
                setLoading(false);
                toast.success('Live location captured!');
            },
            (error) => {
                console.error(error);
                toast.error('Failed to get location: ' + error.message);
                setLoading(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const openInGoogleMaps = () => {
        if (lat && lng) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        } else if (value) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`, '_blank');
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value, lat, lng)}
                        placeholder="Enter Area or capture location"
                        className="pl-9"
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGetLocation}
                    disabled={loading}
                    title="Capture Live Location"
                >
                    <Navigation className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
                </Button>
                {(value || (lat && lng)) && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={openInGoogleMaps}
                        title="Open in Google Maps"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                )}
            </div>
            {lat && lng && (
                <p className="text-[10px] text-slate-600 font-mono">
                    Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
            )}
        </div>
    );
};

export default LocationPicker;
